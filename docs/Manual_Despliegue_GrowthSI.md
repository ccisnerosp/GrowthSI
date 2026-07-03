# Manual de despliegue — GrowthSI

**Destino:** Azure Container Apps (ACA) + Azure Database for PostgreSQL (Flexible Server, pgvector)
**Versión:** 1.2 (as-built) · **Fecha:** 2026-06-05

> Documento operativo. Reemplaza los placeholders `<...>`. **Nunca** publiques secretos ni commitees `.env`.
> Cada paso incluye su equivalente **Vía Portal** (UI de Azure) además del comando CLI. Tres acciones no son 100% UI: *build* de imágenes, `CREATE EXTENSION vector` y el montaje de Azure Files (ver notas en cada paso).
> **v1.2** documenta el despliegue **real ya ejecutado** (ver §0). Donde la realidad difirió del plan, el paso lleva un bloque **⚠️ As-built**.

---

## 0. Estado as-built (despliegue real, 2026-06-05)

GrowthSI está **desplegado y operativo**. Valores reales de esta instancia:

| Recurso | Nombre | Región | Notas |
|---|---|---|---|
| Resource Group | `rg-growthsi` | East US | — |
| Container Apps Env | `cae-growthsi` | East US | Consumption (sin VNet) |
| ACR | `acrgrowthsi` | East US | Basic, admin-enabled |
| Postgres Flexible | `pg-growthsi` | **West US 3** | B1ms v16; eastus/eastus2 **restringidos** para Postgres en esta suscripción |
| Azure OpenAI | `oai-growthsi-e2` | **East US 2** | chat `gpt-5-mini` + emb `text-embedding-3-small`; eastus tenía quota de chat = 0 |
| Key Vault | `kv-growthsi` | East US | RBAC; centraliza los secretos |
| Storage (Azure Files) | `stgrowthsi` | East US | shares `priv`/`pub` para adjuntos |
| Imágenes | `web:v3`, `ai-service:v2` | — | en ACR |
| **URL pública** | `https://web.greenmushroom-396065ee.eastus.azurecontainerapps.io` | — | — |

**Decisiones de modelo IA:** se migró a **Azure OpenAI**. `gpt-4o-mini` quedó **deprecado para nuevos deployments**; `gpt-5.4-mini` tiene **quota 0**. Se usa **`gpt-5-mini`** (familia GPT-5, **razonamiento**) → requirió adaptar `llm.py` (sin `temperature`, `max_completion_tokens`, `reasoning_effort=low`) y `api_version=2024-12-01-preview`. El embedding (`text-embedding-3-small`) es el mismo modelo que los vectores ya cargados → **no hubo re-embedding**.

### Desviaciones plan → realidad (gotchas)
| Plan original | Qué pasó | Resolución |
|---|---|---|
| `az acr build` (build remoto) | `TasksOperationsNotAllowed` (bloqueado en la suscripción) | **`docker build` local + `docker push`** |
| Postgres en `eastus` | `The location is restricted` (eastus/eastus2) | Postgres a **`westus3`** |
| `--database-name growthsi` en el create | No se acepta sin `--node-count` en esta CLI | BD creada aparte: `... db create -n growthsi` |
| `--public-access None` (creía: red pública + sin reglas) | **Deshabilita la red pública entera** | `... update --public-access Enabled` + firewall por IP + `AllowAzureServices` |
| `firewall-rule create -n <srv>` | El servidor es `-s`; `-n`/`--name` es la regla | `... firewall-rule create -s pg-growthsi --name <regla> --start/end-ip-address` |
| Azure OpenAI con `gpt-4o-mini` | Modelo deprecado / quota 0 en varios | Recurso en **eastus2** + **`gpt-5-mini`** (cambio de código por razonamiento) |
| Secretos como secrets de Container App | (endurecido) | **Key Vault** + identidad administrada (§9-ter) |
| Paso 9 con Blob | `@azure/storage-blob` no está en package.json | **Azure Files** (sin código), shares montados (§11) |

### Componentes que NO se usan en esta instancia
- **OpenAI directo** (se migró a Azure OpenAI; el secret `openai-key` quedó huérfano en ai-service → se puede quitar).
- **Azure Document Intelligence** (la ingesta usa PyPDFLoader; upgrade futuro).
- **Blob Storage** (se prefirió Azure Files; el código lo soporta si se añade la dep).
- **Front Door / WAF** (planificado, ver §16 — aún no implementado).

---

## 1. Arquitectura de despliegue

```
Internet ──HTTPS──► [Container App: web]  (ingress EXTERNO, target 3000)
                         │  Prisma                │  X-API-Key (red interna del Environment)
                         ▼                         ▼
        [Azure DB for PostgreSQL + pgvector]   [Container App: ai-service]
                         ▲  asyncpg              (ingress INTERNO, target 8000)
                         └───────────────────────────┘
                                                   │ egress
                                       OpenAI/Azure OpenAI · NVD API
```

| Recurso | Tipo Azure | Ingress | Puerto |
|---|---|---|---|
| `web` | Container App (Node 20) | **Externo** (público, TLS) | 3000 |
| `ai-service` | Container App (Python 3.12) | **Interno** (solo lo alcanza `web`) | 8000 |
| `growthsi` | Azure DB for PostgreSQL Flexible Server | privado | 5432 |
| imágenes | Azure Container Registry (ACR) | — | — |

> **Redis NO se despliega:** el código usa rate-limit en memoria (single-instance). Solo haría falta Redis si escalas a múltiples réplicas (requiere antes migrar el rate-limit; ver §11).

---

## 2. Prerrequisitos

- **Azure CLI** ≥ 2.60 y sesión iniciada: `az login`
- Extensión de Container Apps: `az extension add --name containerapp --upgrade`
- Proveedores registrados (⚠️ as-built: hicieron falta **6**, no 3):
  ```bash
  az provider register --namespace Microsoft.App
  az provider register --namespace Microsoft.OperationalInsights
  az provider register --namespace Microsoft.DBforPostgreSQL
  az provider register --namespace Microsoft.ContainerRegistry   # ACR
  az provider register --namespace Microsoft.Storage             # Azure Files (§11)
  az provider register --namespace Microsoft.CognitiveServices   # Azure OpenAI (§5b)
  az provider register --namespace Microsoft.KeyVault            # secretos (§9-ter)
  ```
- **Docker** instalado y corriendo (el build remoto `az acr build` puede estar bloqueado → se hace `docker build` local; ver §4).
- El repositorio clonado (con `apps/web`, `apps/ai-service`). *Nota:* `knowledge/` puede estar vacío — en esta instancia la KB se sembró **copiando `vector_global` de la BD local a prod** (ver §10).
- Recurso de **Azure OpenAI** con despliegues de chat + `text-embedding-3-small`. ⚠️ As-built: `gpt-4o-mini` ya no es desplegable; se usó **`gpt-5-mini`** (ver §5b). Alternativa: clave de **OpenAI** directo (`gpt-4o-mini`).
- **(Opcional, login empresarial)** Permisos para registrar una **App de Entra ID multi-tenant** en el directorio hogar de GrowthSI (ver §9-bis). Si no se configura, el login funciona solo por credenciales.

### Variables base (ajusta y exporta)
```bash
RG=rg-growthsi
LOC=eastus                 # web/ACR/Env/KV/Storage
LOC_PG=westus3             # ⚠️ Postgres: eastus/eastus2 restringidos en esta suscripción
LOC_AOAI=eastus2           # ⚠️ Azure OpenAI: eastus tenía quota de chat = 0
ACR=acrgrowthsi            # debe ser único global
ENVN=cae-growthsi          # Container Apps Environment
PG=pg-growthsi             # servidor Postgres (único global)
PGADMIN=growthadmin
PGPASS='<password-fuerte>'
```
> ⚠️ As-built: por restricciones de región/quota de la suscripción, **no todo quedó en una sola región**. Confirma disponibilidad antes de crear: `az postgres flexible-server list-skus -l <loc>` y `az cognitiveservices usage list -l <loc>`.

---

## 3. Paso 1 — Grupo de recursos y Environment

```bash
az group create -n $RG -l $LOC
az containerapp env create -n $ENVN -g $RG -l $LOC
```

> **Vía Portal:** *Resource groups → Crear* (`rg-growthsi` + región); luego *Container Apps → Crear* — el asistente crea el Environment (`cae-growthsi`).

---

## 4. Paso 2 — Container Registry y build de imágenes

```bash
az acr create -g $RG -n $ACR --sku Basic --admin-enabled true

# Build remoto en ACR (ideal, pero ver ⚠️ As-built):
az acr build -r $ACR -t web:v1        ./apps/web
az acr build -r $ACR -t ai-service:v1 ./apps/ai-service
```

> ⚠️ **As-built:** `az acr build` falló con **`TasksOperationsNotAllowed`** (ACR Tasks bloqueado en la suscripción). Se compiló **localmente con Docker** y se hizo push:
> ```bash
> az acr login -n $ACR
> docker build -t $ACR.azurecr.io/ai-service:v1 ./apps/ai-service
> docker push  $ACR.azurecr.io/ai-service:v1
> docker build -t $ACR.azurecr.io/web:v1 ./apps/web
> docker push  $ACR.azurecr.io/web:v1
> ```
> **Importante:** crea `apps/web/.dockerignore` (excluye `.env`, `node_modules`, `.next`) antes del build, o se hornearían secretos en la imagen.

> El Dockerfile de `web` ya corre `prisma generate && npm run build`; el de `ai-service` instala `requirements.txt` y arranca uvicorn en 8000.

> **Vía Portal:** *Container registries → Crear* (SKU Basic, *Admin user* habilitado). ⚠️ El Portal no compila imágenes: usa *Container App → Deploy from a source repository (GitHub Actions)*, o haz el build/push con CLI/Docker.

---

## 5. Paso 3 — PostgreSQL + pgvector

```bash
# ⚠️ As-built: -l $LOC_PG (westus3); SIN --database-name (no se acepta sin --node-count)
az postgres flexible-server create \
  -g $RG -n $PG -l $LOC_PG \
  --tier Burstable --sku-name Standard_B1ms --version 16 --storage-size 32 \
  --admin-user $PGADMIN --admin-password "$PGPASS" \
  --public-access Enabled --yes          # NO uses 'None': deshabilita la red pública entera

# BD aparte (el flag --database-name del create no aplica a este SKU):
az postgres flexible-server db create -g $RG -s $PG -n growthsi

# pgvector en el allowlist (la extensión la crea la migración 'init'):
az postgres flexible-server parameter set -g $RG -s $PG --name azure.extensions --value vector

# Firewall: tu IP (operador) + los Container Apps (Azure services)
MYIP=$(curl -s https://api.ipify.org)
az postgres flexible-server firewall-rule create -g $RG -s $PG --name operador-temp \
  --start-ip-address $MYIP --end-ip-address $MYIP
az postgres flexible-server firewall-rule create -g $RG -s $PG --name AllowAzureServices \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
```

> ⚠️ **As-built (4 trampas):**
> 1. **Región:** `eastus`/`eastus2` dieron `The location is restricted` para Postgres → se usó **`westus3`**. Implica latencia cross-region web(eastus)↔BD(westus3) ~60-70 ms (aceptable demo).
> 2. **`--database-name`** no se acepta sin `--node-count` en esta CLI → BD aparte con `db create -n growthsi`.
> 3. **`--public-access None`** **deshabilita** la red pública entera (no "enabled sin reglas"). Como el Environment es Consumption (sin VNet), se usó `--public-access Enabled` + firewall mínimo.
> 4. **`firewall-rule create`**: el servidor es `-s`; `--name` es el nombre de la **regla** (no `-n` del servidor).

La extensión `vector` la crea la **migración `init`** (`CREATE EXTENSION IF NOT EXISTS "vector"`) al correr `prisma migrate deploy` (§8) — no hace falta un cliente SQL aparte si ya está en el allowlist.

**Cadenas de conexión** (ambas con TLS; en Flexible Server no hace falta pooler aparte):
```
DATABASE_URL = postgresql://growthadmin:<PGPASS>@pg-growthsi.postgres.database.azure.com:5432/growthsi?sslmode=require
DIRECT_URL   = (igual que DATABASE_URL)
```
Para el AI service (asyncpg) usa la misma sin el sufijo `?schema=public`.

> **Vía Portal:** *Azure Database for PostgreSQL flexible servers → Crear* (Burstable B1ms, v16, BD `growthsi`, *Public access = None*). pgvector: *Server → Server parameters → `azure.extensions` → añadir `vector`*. ⚠️ `CREATE EXTENSION vector` necesita un cliente SQL (psql / Azure Data Studio / Cloud Shell): el Portal no tiene consola SQL para PostgreSQL.

---

## 6. Paso 4 — Generar secretos

```bash
# AUTH_SECRET (Auth.js):
AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Secreto compartido web ↔ ai-service (CAMBIA el default de dev):
AI_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
```
> ⚠️ `AI_SERVICE_API_KEY` debe ser **idéntico** en ambas apps. Nunca dejes `dev-shared-secret-change-me` en producción.
> ⚠️ `AUTH_SECRET` además **firma el state del onboarding Entra** (HMAC) → debe ser fuerte y único de producción.
> Para login empresarial (Entra), `ENTRA_CLIENT_ID`/`ENTRA_CLIENT_SECRET` se obtienen en §9-bis (App Registration) y se setean tras desplegar `web`.

> **Vía Portal:** no hay un paso "secretos" aparte — se cargan al crear cada Container App (*Settings → Secrets*). Genera `AUTH_SECRET`/`AI_SERVICE_API_KEY` en tu equipo o en Cloud Shell y pégalos ahí.

---

## 7. Paso 5 — Desplegar `ai-service` (ingress interno)

```bash
ACR_SRV=$ACR.azurecr.io
DB_AI="postgresql://$PGADMIN:$PGPASS@$PG.postgres.database.azure.com:5432/growthsi?sslmode=require"

az containerapp create \
  -n ai-service -g $RG --environment $ENVN \
  --image $ACR_SRV/ai-service:v1 \
  --registry-server $ACR_SRV \
  --ingress internal --target-port 8000 \
  --min-replicas 1 --max-replicas 1 \
  --secrets db-url="$DB_AI" ai-key="$AI_KEY" openai-key="<OPENAI_API_KEY>" \
  --env-vars \
    DATABASE_URL=secretref:db-url \
    AI_SERVICE_API_KEY=secretref:ai-key \
    OPENAI_API_KEY=secretref:openai-key \
    OPENAI_CHAT_MODEL=gpt-4o-mini \
    OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# FQDN interno (lo necesita 'web'):
AI_FQDN=$(az containerapp show -n ai-service -g $RG --query properties.configuration.ingress.fqdn -o tsv)
echo "AI_SERVICE_URL = https://$AI_FQDN"
```

### 5b. Azure OpenAI (as-built — lo que se usó en producción)

En vez de OpenAI directo se migró a **Azure OpenAI**. Crear recurso + deployments en una región **con quota**:
```bash
az cognitiveservices account create -n oai-growthsi-e2 -g $RG -l $LOC_AOAI \
  --kind OpenAI --sku S0 --custom-domain oaigrowthsie2 --yes
# Chat (razonamiento) + embeddings. ⚠️ Verifica quota antes: az cognitiveservices usage list -l $LOC_AOAI
az cognitiveservices account deployment create -n oai-growthsi-e2 -g $RG \
  --deployment-name gpt-5-mini --model-name gpt-5-mini --model-version 2025-08-07 \
  --model-format OpenAI --sku-name GlobalStandard --sku-capacity 10
az cognitiveservices account deployment create -n oai-growthsi-e2 -g $RG \
  --deployment-name text-embedding-3-small --model-name text-embedding-3-small --model-version 1 \
  --model-format OpenAI --sku-name Standard --sku-capacity 10
```
Setear en `ai-service` (secret la key; el resto env). Con esto el switch `use_azure` se activa solo:
```
AZURE_OPENAI_ENDPOINT=https://oaigrowthsie2.openai.azure.com/
AZURE_OPENAI_API_KEY=<secret>
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_REASONING=true
```
> ⚠️ **As-built (modelos):**
> - **`gpt-4o-mini`**: GA pero **deprecado para nuevos deployments** → no desplegable.
> - **`gpt-5.4-mini`**: **quota 0** en todas las regiones (requiere ticket).
> - **`gpt-5-mini`** (familia GPT-5, **razonamiento**): sí tiene quota (eastus2/swedencentral). Como es de razonamiento, **rechaza `temperature` custom y `max_tokens`** → se adaptó `apps/ai-service/app/llm.py` (rama `azure_openai_reasoning`: sin temperature, `max_completion_tokens`, `reasoning_effort`) y `config.py` (+`azure_openai_reasoning`). `api_version=2024-12-01-preview`.
> - **Embeddings**: `text-embedding-3-small` (mismo modelo que los vectores cargados) → **no hay que re-embeber** al migrar de OpenAI a Azure.
> - Verificar: `GET /health` del ai-service → `{"llm_provider":"azure"}`.

Verifica salud (desde dentro del Environment o por logs):
```bash
az containerapp logs show -n ai-service -g $RG --tail 50
# Esperado: "Application startup complete" · GET /health → 200
```

> **Vía Portal:** *Container Apps → Crear* → imagen `ai-service:v1` de ACR; *Ingress = Enabled · Internal*; *Target port = 8000*; en *Secrets* añade `db-url`, `ai-key`, `openai-key` y referéncialos en *Environment variables*. El FQDN interno aparece en la pestaña *Ingress*.

---

## 8. Paso 6 — Migraciones de base de datos (Prisma)

Las migraciones se corren **una vez** contra la BD de producción. Desde una máquina operadora con el repo (IP temporalmente permitida en el firewall del Postgres):

```bash
cd apps/web
# PowerShell:  $env:DATABASE_URL="..."; $env:DIRECT_URL="..."; npx prisma migrate deploy
DATABASE_URL="$DB_AI" DIRECT_URL="$DB_AI" npx prisma migrate deploy
```
> Alternativa CI/sin máquina operadora: un **Container Apps Job** con la imagen `web:v1` cuyo comando sea `npx prisma migrate deploy`.

> **Vía Portal:** crea un *Container Apps Job* (*Container Apps → Jobs → Crear*) con la imagen `web:v1` y comando `npx prisma migrate deploy`, o corre la migración desde tu equipo. No es una acción de base de datos del Portal.

---

## 9. Paso 7 — Desplegar `web` (ingress externo)

```bash
az containerapp create \
  -n web -g $RG --environment $ENVN \
  --image $ACR_SRV/web:v1 \
  --registry-server $ACR_SRV \
  --ingress external --target-port 3000 \
  --min-replicas 1 --max-replicas 1 \
  --secrets db-url="$DB_AI?schema=public" auth-secret="$AUTH_SECRET" ai-key="$AI_KEY" \
  --env-vars \
    DATABASE_URL=secretref:db-url \
    DIRECT_URL=secretref:db-url \
    AUTH_SECRET=secretref:auth-secret \
    AUTH_TRUST_HOST=true \
    AI_SERVICE_URL=https://$AI_FQDN \
    AI_SERVICE_API_KEY=secretref:ai-key

# Obtener el FQDN público y fijar AUTH_URL (necesita existir primero):
WEB_FQDN=$(az containerapp show -n web -g $RG --query properties.configuration.ingress.fqdn -o tsv)
az containerapp update -n web -g $RG --set-env-vars AUTH_URL=https://$WEB_FQDN
echo "App pública: https://$WEB_FQDN"
```
> Sin `ENTRA_*`, el login queda **solo por credenciales** (el provider Entra se autodesactiva). Para habilitar login empresarial, continúa en §9-bis.

> **Vía Portal:** *Container Apps → Crear* → imagen `web:v1`; *Ingress = External*; *Target port = 3000*; *Secrets* (`db-url`, `auth-secret`, `ai-key`) y *Environment variables* (incluido `AI_SERVICE_URL` = FQDN interno del ai-service). Tras crearla, edita una nueva revisión para fijar `AUTH_URL` con el FQDN público.

---

## 9-bis. Entra ID — login empresarial multi-tenant (OPCIONAL)

> Habilita que las PYME entren con su **cuenta corporativa** (modelo App multi-tenant + JIT). Si no lo necesitas, omite esta sección.

**Orden importante (chicken-egg del OIDC):** primero existe `web` (ya tienes su FQDN), recién entonces se registran los redirect URIs.

### a) App Registration (multi-tenant) en el directorio hogar de GrowthSI
```bash
APP_ID=$(az ad app create --display-name "GrowthSI SGSI" \
  --sign-in-audience AzureADMultipleOrgs \
  --web-redirect-uris \
    "https://$WEB_FQDN/api/auth/callback/microsoft-entra-id" \
    "https://$WEB_FQDN/api/onboarding/consent-callback" \
  --query appId -o tsv)

# Client secret
ENTRA_SECRET=$(az ad app credential reset --id $APP_ID --append --query password -o tsv)
echo "ENTRA_CLIENT_ID=$APP_ID"
```
- Permisos delegados mínimos: `openid`, `profile`, `email` (admin-consentables).
- Los redirect URIs deben coincidir **exactamente** con el FQDN público.

### b) Setear los secretos en `web` (NO van en ai-service)
```bash
az containerapp secret set -n web -g $RG \
  --secrets entra-id="$APP_ID" entra-secret="$ENTRA_SECRET"
az containerapp update -n web -g $RG --set-env-vars \
  ENTRA_CLIENT_ID=secretref:entra-id \
  ENTRA_CLIENT_SECRET=secretref:entra-secret
```
> **Recomendado:** guardar `ENTRA_CLIENT_SECRET` en **Azure Key Vault** y referenciarlo desde la Container App, en vez de secreto plano.

### c) Verificación
```bash
curl -s https://$WEB_FQDN/api/auth/providers | grep -o "microsoft-entra-id"
# Debe aparecer → el botón "Continuar con cuenta empresarial" se activa solo en /login.
```

### d) Alta de la primera organización (admin consent · post-deploy)
1. El **admin de TI de la PYME** abre `https://$WEB_FQDN/onboarding`, completa datos + **dominio corporativo**.
2. Es redirigido al **admin-consent** de Microsoft; al aceptar, su `tid` queda mapeado (`consent=granted`).
3. A partir de ahí, los usuarios entran por **JIT** (primer usuario = Administrador; resto = Auditor).

> **Vía Portal (recomendado para Entra):** *Microsoft Entra ID → App registrations → New registration* → *Accounts in any organizational directory (multitenant)*. En *Authentication → Add a platform → Web* añade los 2 redirect URIs. En *Certificates & secrets → New client secret* copia el valor. En *API permissions*, Microsoft Graph delegated `openid/profile/email`. Copia el *Application (client) ID*. Luego, en *Container App `web` → Secrets / Environment variables*, añade `ENTRA_CLIENT_ID` y `ENTRA_CLIENT_SECRET`.

> ✅ **As-built:** Entra quedó cableado (App `GrowthSI SGSI`, client_id `2eb0b102-…`, SP creado). Verificado: `/api/auth/providers` lista `microsoft-entra-id` y el authorize redirige a `login.microsoftonline.com/organizations`.

### e) (Demo) Permitir cuentas Microsoft **personales** — ⚠️ temporal
El issuer por defecto (`/organizations`) acepta solo work/school. Para demostrar el login con una **cuenta personal** (MSA) hacen falta **3 cambios** (revertibles):
1. **App Registration** → audiencia `AzureADandPersonalMicrosoftAccount` (+ `requestedAccessTokenVersion=2`):
   ```bash
   az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/<objectId>" \
     --headers "Content-Type=application/json" \
     --body '{"signInAudience":"AzureADandPersonalMicrosoftAccount","api":{"requestedAccessTokenVersion":2}}'
   ```
2. **Issuer → `/common`**: `auth.ts` lee `process.env.ENTRA_ISSUER` → setear en `web` `ENTRA_ISSUER=https://login.microsoftonline.com/common/v2.0` (requiere rebuild de la imagen que incluya ese cambio).
3. **BD**: todas las MSA personales comparten el tid **consumers** `9188040d-6c67-4c5b-b112-36a304b66dad`. Mapearlo a un Tenant con consent y ajustar el dominio del gate:
   ```sql
   UPDATE tenant SET entra_tenant_id='9188040d-6c67-4c5b-b112-36a304b66dad', consent_status='granted', consent_granted_at=now() WHERE id=<tenant>;
   UPDATE organizacion SET dominio='outlook.com' WHERE id=<org>;   -- o el dominio de la cuenta
   ```
> ⚠️ **Riesgo:** mientras esté así, **cualquier** cuenta personal del dominio configurado se auto-provisiona (JIT) como Auditor. **Revertir** tras la demo: quitar `ENTRA_ISSUER`, `entra_tenant_id=NULL`/`consent_status=NULL`, restaurar dominio, y devolver la audiencia a `AzureADMultipleOrgs`.

---

## 9-ter. Endurecimiento de secretos con Azure Key Vault (RECOMENDADO)

Centraliza los secretos en Key Vault; las Container Apps los leen vía **identidad administrada** (no quedan en texto plano en la app).
```bash
# 1) Vault (RBAC) + rol para escribir secretos a tu usuario
az keyvault create -n kv-growthsi -g $RG -l $LOC --enable-rbac-authorization true
az role assignment create --assignee <tu-oid> --role "Key Vault Secrets Officer" \
  --scope $(az keyvault show -n kv-growthsi --query id -o tsv)
# 2) Cargar los secretos reales
az keyvault secret set --vault-name kv-growthsi --name db-url           --value "<DATABASE_URL>"
az keyvault secret set --vault-name kv-growthsi --name auth-secret      --value "<AUTH_SECRET>"
az keyvault secret set --vault-name kv-growthsi --name ai-key           --value "<AI_SERVICE_API_KEY>"
az keyvault secret set --vault-name kv-growthsi --name azure-openai-key --value "<AZURE_OPENAI_API_KEY>"
az keyvault secret set --vault-name kv-growthsi --name entra-secret     --value "<ENTRA_CLIENT_SECRET>"
# 3) Identidad administrada en cada app + rol de lectura
for APP in web ai-service; do
  PID=$(az containerapp identity assign -n $APP -g $RG --system-assigned --query principalId -o tsv)
  az role assignment create --assignee-object-id $PID --assignee-principal-type ServicePrincipal \
    --role "Key Vault Secrets User" --scope $(az keyvault show -n kv-growthsi --query id -o tsv)
done
# 4) Reapuntar los secrets a Key Vault (ejemplo web)
KV=https://kv-growthsi.vault.azure.net/secrets
az containerapp secret set -n web -g $RG --secrets \
  "db-url=keyvaultref:$KV/db-url,identityref:system" \
  "auth-secret=keyvaultref:$KV/auth-secret,identityref:system" \
  "ai-key=keyvaultref:$KV/ai-key,identityref:system" \
  "entra-secret=keyvaultref:$KV/entra-secret,identityref:system"
az containerapp revision restart -n web -g $RG --revision <activa>   # para tomar los secretos del vault
```
> ✅ **As-built:** hecho para `web` (db-url, auth-secret, ai-key, entra-secret) y `ai-service` (db-url, ai-key, azure-openai-key). Ambas reinician Healthy leyendo de KV. La rotación de un secreto = actualizarlo en el vault (sin tocar el contenedor).

---

## 10. Paso 8 — Sembrar la base de conocimiento (RAG)

El índice `vector_global` arranca vacío. Hay que cargarlo una vez.

> ✅ **As-built:** en esta instancia la KB ya existía en la **BD local** (1438 chunks, 7 fuentes). Se sembró prod **copiando `vector_global` local→prod** con un script idempotente (`ON CONFLICT (fuente, chunk_hash) DO NOTHING`, leyendo `embedding::text` y reinsertando con `::vector`) — así **no se re-embebió** (sin costo OpenAI) y se trajeron también las fuentes de PDF (que no estaban como archivos). Luego se depuró ruido con `scripts/clean_corpus.py --apply` (borró 2 chunks de carátula legal). Total final: **1438 chunks**. Si NO tienes la KB local, usa los métodos (a)/(b) de abajo.

**a) Catálogos curados (MITRE/ENISA) — conexión directa a la BD** (desde la máquina operadora con `DATABASE_URL` apuntando a prod):
```bash
cd apps/ai-service
# crea un venv e instala requirements, luego:
python scripts/seed_threats.py
python scripts/seed_mitre_xlsx.py    # si aplica a tu fuente MITRE
```

**b) PDFs (ISO 27001/27002/27005, ENISA Threat Landscape) — endpoint `/v1/ingest/iso`:**
Como `ai-service` tiene ingress **interno**, elige una de estas vías para el bootstrap:
- **Recomendada:** un **Container Apps Job** (imagen `ai-service`) o `az containerapp exec` dentro del contenedor, con los PDFs montados, llamando al endpoint en `localhost:8000`.
- **Rápida (one-time):** habilita temporalmente ingress externo en `ai-service` con restricción a tu IP, ingiere, y revierte a interno:
  ```bash
  curl -F "file=@knowledge/iso27001_2022.pdf" -F "fuente=iso27001_2022" \
       -H "X-API-Key: $AI_KEY" https://<ai-service-temporal>/v1/ingest/iso
  # repite con fuente=base_iso_27002_controles, base_iso_27005_amenazas, base_enisa_threat_landscape
  az containerapp ingress update -n ai-service -g $RG --type internal   # revertir
  ```
> El filtro de ruido en la ingesta ya descarta carátulas/índices/referencias automáticamente.

Verifica el índice:
```bash
# desde la máquina operadora con DATABASE_URL de prod:
python scripts/eval_rag.py --ops-only     # muestra "Frescura del índice" por fuente
```

---

## 11. Paso 9 — Persistencia de adjuntos de documentos

> **Atención:** los adjuntos se guardan hoy en el **filesystem local** (`.private-uploads`). En ACA los contenedores son **efímeros** → ese directorio **se pierde** al reiniciar/escalar.

✅ **As-built — resuelto con Azure Files** (sin cambio de código). Hay **dos** rutas a persistir: `.private-uploads` (los `.docx`, privados) y `public/uploads` (imágenes de documentos) → **dos shares**:
```bash
# 1) Storage account + 2 file shares
az storage account create -g $RG -n stgrowthsi -l $LOC --sku Standard_LRS --kind StorageV2
az storage share-rm create -g $RG --storage-account stgrowthsi -n priv --quota 5
az storage share-rm create -g $RG --storage-account stgrowthsi -n pub  --quota 5

# 2) Registrar ambos shares en el Environment
KEY=$(az storage account keys list -g $RG -n stgrowthsi --query "[0].value" -o tsv)
az containerapp env storage set -g $RG -n $ENVN --storage-name priv \
  --azure-file-account-name stgrowthsi --azure-file-account-key "$KEY" \
  --azure-file-share-name priv --access-mode ReadWrite
az containerapp env storage set -g $RG -n $ENVN --storage-name pub \
  --azure-file-account-name stgrowthsi --azure-file-account-key "$KEY" \
  --azure-file-share-name pub --access-mode ReadWrite

# 3) Montar en 'web' vía YAML (az containerapp update --yaml). Bajo template:
#    volumes: [{name: priv-vol, storageType: AzureFile, storageName: priv},
#              {name: pub-vol,  storageType: AzureFile, storageName: pub}]
#    container.volumeMounts: [{volumeName: priv-vol, mountPath: /app/.private-uploads},
#                             {volumeName: pub-vol,  mountPath: /app/public/uploads}]
az containerapp show -n web -g $RG --output yaml > web.yaml   # editar y re-aplicar:
az containerapp update -n web -g $RG --yaml web.yaml
```
> El WORKDIR del contenedor `web` es `/app`, y el código usa `process.cwd()` → las rutas montadas son `/app/.private-uploads` y `/app/public/uploads`.
> **Por qué Azure Files y no Blob:** el código (`lib/storage.ts`) soporta Blob si se setean `AZURE_STORAGE_CONNECTION_STRING`+`AZURE_STORAGE_CONTAINER`, pero `@azure/storage-blob` **no está en package.json** (requeriría dep + rebuild) y las **imágenes** (`saveImage`) devuelven URL absoluta de blob → exigiría contenedor público. Azure Files preserva el modelo de serving y no expone nada público. **No servir adjuntos confidenciales desde rutas públicas.**

> **Vía Portal:** *Storage accounts → Crear* + *File shares → Crear* (`uploads`); registra el share en *Container Apps Environment → Settings → Azure Files*. ⚠️ El montaje del volumen en la app tiene soporte UI parcial: si no aparece en el editor de la app, usar YAML/CLI.

---

## 12. Paso 10 — Verificación (smoke test)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://$WEB_FQDN/login        # 200
curl -s -o /dev/null -w "%{http_code}\n" https://$WEB_FQDN/dashboard     # 307 (redirige a login = OK)
# ai-service NO debe ser accesible desde Internet (ingress interno) → verificar que no responde público.
```
Funcional: inicia sesión, abre **Riesgos → Sugerir con IA** y **Controles → Sugerir** para confirmar que `web` alcanza al `ai-service` y este al LLM.

---

## 13. Operación

- **Actualizar:** `az acr build -t web:v2 ./apps/web` → `az containerapp update -n web -g $RG --image $ACR_SRV/web:v2`. ACA crea una **revisión** nueva.
- **Rollback:** `az containerapp revision list/activate` para volver a una revisión previa.
- **Logs:** `az containerapp logs show -n web -g $RG --follow`.
- **Backups Postgres:** automáticos en Flexible Server (configura retención/PITR).
- **Escalado:** hoy `--min/max-replicas 1` (rate-limit y dedup-tracking son en memoria). Para escalar a >1 réplica primero migrar el rate-limit a Redis/BD (no implementado).

---

## 14. Checklist de seguridad

- [x] ✅ **Provider `ms-simulated` RETIRADO** de `apps/web/auth.ts` (era un bypass passwordless por email). Verificado: `/api/auth/providers` ya **no** lo lista (solo `credentials` + `microsoft-entra-id`).
- [x] `AI_SERVICE_API_KEY` cambiado (no el default de dev) e idéntico en ambas apps.
- [x] `ai-service` con **ingress interno** (no accesible desde Internet; expuesto solo temporalmente y restringido a IP para `/health`, luego revertido).
- [x] Postgres con **red pública + firewall mínimo** (`operador-temp` por IP + `AllowAzureServices`); `sslmode=require`. ⚠️ La regla de operador se **cierra** al terminar tareas de BD.
- [x] Secretos en **Azure Key Vault** vía identidad administrada (§9-ter) — no en texto plano.
- [x] `.env` nunca commiteado; `AUTH_SECRET` **fuerte y único de prod** (también firma el state del onboarding Entra).
- [x] Adjuntos confidenciales no servidos desde URL pública (Azure Files; `.docx` se sirven por ruta autenticada).
- [x] Clave de Azure OpenAI solo en `ai-service` (en KV). ⚠️ Pendiente menor: quitar el `openai-key` huérfano (OpenAI directo, sin uso).
- [x] **(Entra)** `ENTRA_CLIENT_SECRET` en Key Vault; redirect URIs exactos al FQDN. Pendiente: rotación periódica del secret.
- [ ] ⚠️ **(Demo)** Si activaste cuentas personales (§9-bis-e), revertirlo antes de un uso real.
- [ ] (Opcional) **Front Door + WAF** delante de `web` (§16) — aún no implementado.

---

## 15. Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| web 500 al sugerir IA | `AI_SERVICE_URL`/`AI_SERVICE_API_KEY` mal | Verificar FQDN interno y que la clave coincide |
| `relation ... does not exist` | Migraciones no corridas | Ejecutar `prisma migrate deploy` (§8) |
| Recuperación RAG vacía | Knowledge base no sembrado | Ejecutar §10 y `eval_rag.py --ops-only` |
| `type "vector" does not exist` | pgvector no habilitado | `azure.extensions=vector` + `CREATE EXTENSION vector` |
| Adjuntos desaparecen | FS efímero sin Azure Files | Montar Azure Files (§11) |
| 401 del ai-service | X-API-Key ausente/incorrecta | Revisar secret compartido |
| Botón "cuenta empresarial" no aparece | `ENTRA_*` sin setear | Configurar §9-bis; `curl …/api/auth/providers` debe listar `microsoft-entra-id` |
| Login Entra falla con `redirect_uri mismatch` | Redirect URI no coincide con el FQDN | Registrar exacto en la App de Entra (§9-bis-a) |
| `org_no_habilitada` al entrar con Entra | Tenant sin admin-consent | El admin debe completar `/onboarding` (§9-bis-d) |
| `dominio_no_coincide` | Correo del usuario ≠ `Organizacion.dominio` | Verificar el dominio corporativo registrado en el onboarding |
| `TasksOperationsNotAllowed` en `az acr build` | ACR Tasks bloqueado en la suscripción | Build local con `docker build` + `docker push` (§4) |
| `The location is restricted` (Postgres/AOAI) | Región/SKU restringido para la suscripción | Probar otra región (`westus3` para Postgres, `eastus2` para Azure OpenAI) |
| `InsufficientQuota` al crear deployment de modelo | Quota = 0 para ese modelo/región | `az cognitiveservices usage list -l <loc>`; elegir modelo con quota o pedir aumento |
| `ServiceModelDeprecated` (gpt-4o-mini) | Versión deprecada para nuevos deployments | Usar un modelo vigente (p. ej. `gpt-5-mini`, ver §5b) |
| Azure OpenAI: error `temperature`/`max_tokens` | Modelo de razonamiento (GPT-5) con params no soportados | `AZURE_OPENAI_REASONING=true` (usa `max_completion_tokens`, sin temperature) |
| `Firewall rule operations are not supported...` | Postgres creado con `--public-access None` | `az postgres flexible-server update --public-access Enabled` y reintentar |
| DataGrip: "driver can be used only with SQL Server" | Fuente creada como SQL Server, no PostgreSQL | Crear la fuente como **PostgreSQL** (URL `jdbc:postgresql://...`) |

> **Nota:** **Azure Document Intelligence** NO es dependencia de despliegue — la ingesta usa PyPDFLoader; es un upgrade futuro opcional. La ingesta ya **autofiltra ruido** (carátulas, índices, listas de URLs).

---

## 16. Azure Front Door + WAF (OPCIONAL — perímetro y firewall de aplicación)

> Estado: **planificado, no implementado.** Pone un reverse-proxy global con TLS y **WAF** delante de `web`. La `ai-service` no cambia (sigue interna).
>
> Flujo: `usuario → Front Door (WAF inspecciona) → origin: web (Container App)`.

**Pasos:**
1. **Perfil** `afd-growthsi` — **SKU Premium** (las reglas WAF *gestionadas* OWASP exigen Premium; Standard solo permite reglas custom):
   ```bash
   az afd profile create -g $RG --profile-name afd-growthsi --sku Premium_AzureFrontDoor
   az afd endpoint create -g $RG --profile-name afd-growthsi --endpoint-name growthsi
   ```
2. **Origin group + origin** apuntando al FQDN de `web` (HTTPS/443) + health probe a `/login`; **route** `/*` con redirección HTTP→HTTPS.
3. **WAF policy** (`az network front-door waf-policy` + asociación con `az afd security-policy`):
   - Reglas gestionadas: `Microsoft_DefaultRuleSet` (OWASP) + `Microsoft_BotManagerRuleSet`.
   - **Empezar en modo `Detection`** → revisar falsos positivos (la app sube `.docx`, guarda HTML, manda JSON) → pasar a **`Prevention`**.
   - Reglas custom: rate-limit (p. ej. 100 req/min/IP) en `/login`, geo-filtering.
4. **Cerrar el bypass del origin** (que nadie pegue directo al FQDN del contenedor):
   - **(a) Private Link** (lo más limpio) — ⚠️ requiere Environment con **workload profiles + VNet**; el actual `cae-growthsi` es **Consumption puro** → no soporta private endpoints sin recrearlo.
   - **(b) Validar el header `X-Azure-FDID`** en `apps/web/middleware.ts` (rechazar 403 si no trae el Front Door ID correcto) → cambio de código + rebuild. **Vía recomendada para este Environment.**
5. **Reparar Auth.js** (obligatorio — la URL pública cambia):
   - `AUTH_URL` del Container App `web` → la URL de Front Door.
   - **Redirect URIs** del App Registration de Entra → añadir `https://<host-frontdoor>/api/auth/callback/microsoft-entra-id` y `/api/onboarding/consent-callback`.
   Sin esto, el login (credenciales **y** Entra) deja de funcionar.

> **Costo:** AFD **Premium** tiene costo base mensual fijo + por request/GB (las reglas gestionadas lo exigen). Alternativa regional más barata: **Application Gateway + WAF v2** (sin CDN global, mismo OWASP).

---

_Fin del manual (v1.2 as-built). Generado para GrowthSI; sin secretos reales — todos los valores sensibles son placeholders._
