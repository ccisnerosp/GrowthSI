// Fase 1 — Resolución/provisioning de un login Entra ID (multi-tenant + JIT).
//
// Dado los claims de un id_token de Entra (tid, oid, email, name), resuelve el
// Usuario de GrowthSI aplicando las decisiones D1–D5:
//   · D1 admin consent  → solo tenants con consent_status = "granted".
//   · D2 rol JIT         → primer usuario de la org = Administrador; resto = default_rol_jit (Auditor).
//   · D4 account-linking → vincular por email solo si el dominio coincide con Organizacion.dominio.
//   · D5 mapeo           → entra_tenant_id (tid) → Tenant (1:1) → su Organización.
// Identidad primaria: (tid, oid). El email solo sirve para enlazar al primer login.

import { prisma } from "@/lib/db";
import type { Rol } from "@/lib/rbac";

export type EntraClaims = { tid: string; oid: string; email: string; name: string };

export type EntraResolved = {
  userId: number; nombre: string; correo: string; rol: Rol;
  organizacion_id: number; tenant_id: number; azure_oid: string;
};

export type EntraResult = { ok: true; user: EntraResolved } | { ok: false; error: string };

const USER_SELECT = {
  id: true, nombre: true, correo: true, rol: true,
  organizacion_id: true, azure_oid: true, estado: true,
} as const;

function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function build(u: { id: number; nombre: string; correo: string; rol: string; organizacion_id: number; azure_oid: string | null }, tenant_id: number, oid: string): EntraResult {
  return {
    ok: true,
    user: {
      userId: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol as Rol,
      organizacion_id: u.organizacion_id, tenant_id, azure_oid: u.azure_oid ?? oid,
    },
  };
}

export async function resolveEntraLogin(claims: EntraClaims): Promise<EntraResult> {
  const tid = claims.tid?.trim();
  const oid = claims.oid?.trim();
  const email = (claims.email ?? "").toLowerCase().trim();
  if (!tid || !oid) return { ok: false, error: "claims_incompletos" };

  // ── D5/D1: Tenant onboarded por tid y con consentimiento de administrador ──
  const tenant = await prisma.tenant.findUnique({
    where: { entra_tenant_id: tid },
    select: {
      id: true, consent_status: true, default_rol_jit: true,
      organizaciones: { select: { id: true, dominio: true }, take: 1, orderBy: { id: "asc" } },
    },
  });
  if (!tenant || tenant.consent_status !== "granted") return { ok: false, error: "org_no_habilitada" };
  const org = tenant.organizaciones[0];
  if (!org) return { ok: false, error: "org_no_encontrada" };
  const dominio = (org.dominio ?? "").toLowerCase();

  // ── Resolución 1: por oid (usuario Entra ya existente) ──
  const byOid = await prisma.usuario.findUnique({ where: { azure_oid: oid }, select: USER_SELECT });
  if (byOid) {
    if (byOid.estado !== "activo") return { ok: false, error: "usuario_inactivo" };
    await prisma.usuario.update({ where: { id: byOid.id }, data: { ultimo_acceso_at: new Date() } });
    return build(byOid, tenant.id, oid);
  }

  // ── Resolución 2 (D4): linking por email, con match de dominio ──
  if (email) {
    const byEmail = await prisma.usuario.findUnique({
      where: { correo: email },
      select: { ...USER_SELECT, organizacion_id: true },
    });
    if (byEmail) {
      if (byEmail.organizacion_id !== org.id) return { ok: false, error: "conflicto_email_otra_org" };
      if (dominio && domainOf(email) !== dominio) return { ok: false, error: "dominio_no_coincide" };
      if (byEmail.estado !== "activo") return { ok: false, error: "usuario_inactivo" };
      const linked = await prisma.usuario.update({
        where: { id: byEmail.id },
        data: { azure_oid: oid, auth_provider: "entra", ultimo_acceso_at: new Date() },
        select: USER_SELECT,
      });
      return build(linked, tenant.id, oid);
    }
  }

  // ── Resolución 3 (D2): JIT provisioning ──
  // Gate de dominio también para creación (un invitado externo del directorio no auto-provisiona).
  if (dominio && email && domainOf(email) !== dominio) return { ok: false, error: "dominio_no_coincide" };
  const usuariosOrg = await prisma.usuario.count({ where: { organizacion_id: org.id, deleted_at: null } });
  const rol: Rol = usuariosOrg === 0 ? "Administrador" : ((tenant.default_rol_jit as Rol) ?? "Auditor");
  const created = await prisma.usuario.create({
    data: {
      organizacion_id: org.id,
      nombre: claims.name?.trim() || email || "Usuario Entra",
      correo: email || `${oid}@entra.local`, // fallback si el token no trae email
      password_hash: null,
      funcion: rol === "Administrador" ? "Administrador del SGSI" : "Usuario",
      rol,
      area: "—",
      auth_provider: "entra",
      azure_oid: oid,
      estado: "activo",
      ultimo_acceso_at: new Date(),
    },
    select: USER_SELECT,
  });
  return build(created, tenant.id, oid);
}
