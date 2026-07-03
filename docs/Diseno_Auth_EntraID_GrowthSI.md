# Diseño — Reestructuración de autenticación: Entra ID multi-tenant (JIT)

**Proyecto:** GrowthSI · **Fecha:** 2026-06-04 · **Estado:** Diseño (sin código aún)
**Modelo elegido:** App **multi-tenant** + **JIT provisioning** (las PYME entran con su cuenta corporativa de su propio tenant; mapeamos `tid → organización`).

> Objetivo: permitir login con cuenta empresarial (Entra ID) sin romper el login por credenciales actual, evolucionando el modelo existente (que ya anticipa `azure_oid` y `tenant_id`).

---

## 1. Punto de partida (as-is, verificado)

- **Auth.js v5**, sesión **JWT**. Providers: `credentials` (email+password+bcrypt) y `ms-simulated` (**mock**: busca por email y exige `azure_oid` ya vinculado; sin OIDC real).
- **`/api/registro`** crea **Tenant + Organización + Usuario(admin)** con email/password (autoservicio).
- Modelo: `Tenant {id,nombre,plan,activo}` 1—N `Organizacion {tenant_id, ruc, ...}` 1—N `Usuario {organizacion_id, correo, password_hash, rol, azure_oid?@unique, estado}`.
- Sesión/JWT ya lleva: `userId, rol, organizacion_id, tenant_id, azure_oid`.

**Problema central:** onboarding y autenticación están **fusionados**, y **no existe mapeo del tenant de Entra (`tid`) → organización de GrowthSI** — el eslabón que hace posible el login cross-tenant.

---

## 2. Modelo objetivo (App multi-tenant + JIT)

- GrowthSI se registra como **app multi-tenant** (`AzureADMultipleOrgs`) en su tenant hogar.
- Autoridad **`/organizations`** (cuentas work/school de cualquier organización; NO `/common`, que admite cuentas personales).
- Cada PYME = un **tenant de Entra (`tid`)** que se **mapea a un Tenant/Organización** de GrowthSI durante el **onboarding con consentimiento de administrador**.
- Los usuarios se **provisionan al primer login (JIT)**, validando que su `tid` esté **onboarded/consentido**.

---

## 3. Dos flujos separados (clave del rediseño)

### 3.1 Onboarding de organización (una vez, por el admin de la PYME)
```
Admin PYME → "Registrar/conectar mi organización"
   1. Captura datos de la organización (sin password)  → /api/onboarding/start
   2. Se le entrega la URL de ADMIN CONSENT de la app multi-tenant:
        https://login.microsoftonline.com/{tenant}/adminconsent?client_id=<APP_ID>&redirect_uri=<callback>
   3. El admin consiente la app en SU directorio Entra
   4. Callback → capturamos su `tid`, marcamos consent=granted,
      guardamos entra_tenant_id→Organización, y al admin como Administrador (azure_oid)
```
> El consentimiento de **administrador** (no de usuario) da control a nivel organización y nos permite confiar el mapeo `tid→org`.

### 3.2 Login de usuario (cada vez, JIT)
```
Usuario → "Continuar con cuenta empresarial (Microsoft)"
   1. OIDC auth-code (Auth.js Entra provider, /organizations)
   2. id_token: { tid, oid, email/preferred_username, name }
   3. signIn callback:
        a. Buscar Tenant por entra_tenant_id = tid (consent=granted)
           · si no existe/consentido → DENEGAR ("tu organización no está habilitada;
             pide a tu admin que complete el alta")
        b. Resolver Usuario:
           · por azure_oid (oid)  → existe
           · si no, por email verificado dentro de esa org → vincular (set azure_oid)
           · si no, JIT-provision nuevo Usuario en esa org
        c. Asignar rol (ver §6)
   4. jwt/session → { userId, rol, organizacion_id, tenant_id, azure_oid }
```

---

## 4. Cambios en el modelo de datos (aditivos, sin romper)

**Tenant** (frontera de cuenta = directorio Entra del cliente):
```prisma
entra_tenant_id     String?  @unique   // el `tid` del directorio Entra de la PYME
auth_method         String   @default("credentials") // credentials | entra | both
consent_status      String?            // pending | granted | revoked
consent_granted_at  DateTime?
default_rol_jit     String?            // rol por defecto para usuarios JIT
```

**Usuario:**
```prisma
password_hash   String?  // AHORA NULLABLE (usuarios solo-Entra no tienen password)
auth_provider   String   @default("credentials") // credentials | entra
// azure_oid ya existe y es @unique (el `oid` del usuario en Entra)
```

> Mapeo `tid` a **Tenant** (no a Organización), y dentro del Tenant se resuelve la Organización. Hoy es 1 Tenant = 1 Organización, así que es efectivamente 1:1; si en el futuro un Tenant tiene varias Organizaciones, se añade una regla de resolución (p. ej. por dominio de correo o selección).

---

## 5. Configuración del provider (Auth.js v5)

- Reemplazar `ms-simulated` por **`microsoft-entra-id`** (provider real). Mantener `credentials` para organizaciones que no usen Entra (coexistencia).
- Autoridad **multi-tenant**: `/organizations`.
- **Gotcha conocido:** en multi-tenant el `iss` del id_token es `https://login.microsoftonline.com/{tid}/v2.0` (varía por usuario). No se puede fijar un único `issuer` estricto → la validación del tenant se hace **en el `signIn` callback contra la allowlist de tenants consentidos**, no solo por issuer.
- Secret del cliente en **ACA secrets / Key Vault** (nunca en `.env` commiteado).

Esqueleto (pseudocódigo, no final):
```ts
providers: [
  Credentials({ /* ... el actual, sin cambios ... */ }),
  MicrosoftEntraID({
    clientId: env.ENTRA_CLIENT_ID,
    clientSecret: env.ENTRA_CLIENT_SECRET,
    issuer: "https://login.microsoftonline.com/organizations/v2.0",
    // authorization scopes: openid profile email
  }),
],
callbacks: {
  async signIn({ account, profile }) {
    if (account?.provider !== "microsoft-entra-id") return true; // credentials sigue igual
    const { tid, oid, email, name } = extractClaims(profile);
    const tenant = await findTenantByEntraTid(tid);          // consent=granted
    if (!tenant) return "/login?error=org_no_habilitada";
    await resolveOrJitProvisionUser({ tenant, oid, email, name });
    return true;
  },
  async jwt({ token, user, account, profile }) { /* poblar claims resueltos */ },
  async session({ session, token }) { /* igual que hoy */ },
}
```

---

## 6. Roles y autorización en JIT  *(D2 decidida)*

- **Primer usuario** de una organización (el admin que consintió) → **Administrador**.
- **Usuarios JIT siguientes** → **Auditor (solo lectura)** por defecto (`default_rol_jit = "Auditor"`). El admin puede elevar el rol o desactivar al usuario en el módulo Usuarios.
- **Implicación de seguridad (anotada):** cualquier usuario de un directorio Entra **ya consentido** obtiene **lectura inmediata** del SGSI al primer login (riesgos, controles, evidencias). Mitigaciones: (a) el *gate* de consentimiento limita esto a organizaciones onboarded; (b) el admin puede **desactivar** usuarios; (c) Fase 3 (mapeo de grupos de Entra) permite restringir quién obtiene acceso.
- **Fase 3 (opcional):** mapear **app roles / grupos de Entra** (claims `roles`/`groups`) → `rol` de GrowthSI, para que solo grupos autorizados obtengan acceso (y automatizar la asignación).

---

## 7. Política de account-linking (evitar suplantación)

- Vincular un login Entra a un Usuario existente **solo** si el email coincide **dentro de la misma organización mapeada** y el dominio es el del tenant. Al vincular, set `azure_oid` + `auth_provider="entra"`.
- **Nunca** vincular entre tenants distintos. Email existente en **otra** organización → conflicto (no auto-vincular).

---

## 8. Seguridad

- Gate de **`tid` consentido** (allowlist) antes de cualquier JIT.
- Validación de **audience** (= nuestro `clientId`) y del `tid` por callback.
- **MFA** delegada a las Conditional Access del cliente en su Entra (reflejar en `mfa_activo` si interesa).
- **Mínimo privilegio** en el rol JIT por defecto.
- **Consentimiento de administrador** (no de usuario) para control a nivel organización.
- Secret del cliente en Key Vault/ACA secrets.

---

## 9. Plan de implementación por fases (sin romper el login actual)

| Fase | Entregable | Riesgo |
|---|---|---|
| **0** | Migración aditiva: `entra_tenant_id`, `password_hash` nullable, `auth_provider`, campos de consent | Bajo (aditivo) |
| **1** | Provider `microsoft-entra-id` + callbacks (coexiste con credentials); endpoint de onboarding + URL de admin-consent; JIT provisioning | Medio |
| **2** | UI: botón "Continuar con cuenta empresarial"; wizard de onboarding/consent; separar registro credentials del onboarding Entra | Medio |
| **3** | Mapeo de roles desde grupos/app-roles de Entra (opcional) | Bajo |
| **Limpieza** | Eliminar el provider `ms-simulated` cuando Entra esté operativo | Bajo |

> Cada fase deja el sistema funcionando: el login por credenciales nunca se interrumpe.

---

## 10. Decisiones tomadas (2026-06-04)

| # | Decisión | Resuelto |
|---|---|---|
| D1 | Tipo de consentimiento | **Admin consent** (el admin de la PYME consiente para todo el directorio) |
| D2 | Rol JIT por defecto | **Auditor (solo lectura)** — ver implicación de seguridad en §6 |
| D3 | Coexistencia de métodos | **Forzar uno por org; `both` solo opt-in explícito** |
| D4 | Account-linking | **Exigir match de dominio** (correo Entra vs `Organizacion.dominio`); identidad primaria (`tid`,`oid`) |
| D5 | Mapeo `tid` | **1 Tenant = 1 directorio Entra (1:1)**; regla de resolución si a futuro 1 Tenant tiene varias organizaciones |

> Con D1–D5 cerradas, el diseño está listo para implementarse por fases (§9). Fase 0 = migración aditiva del modelo de datos.

---

## 11. Impacto en la arquitectura (target)

Esto **activa** las cajas que hoy son aspiracionales en tu diagrama objetivo:
- **Entra ID (AzureADMultipleOrgs)** → real, multi-tenant, OIDC/JWT.
- **Key Vault** → para el client secret de la app Entra.
- (Sin relación con Blob/Document Intelligence, que siguen su propio camino.)

_Documento de diseño. No introduce cambios de código; define el plan para implementarlos por fases._
