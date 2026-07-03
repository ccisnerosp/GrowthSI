// ────────────────────────────────────────────────────────────────────
// RBAC — Roles y permisos (HU04)
//
// 4 roles soportados (acordados con el PO):
//   · Administrador  → control total + gestión de usuarios y tenant
//   · CISO           → SGSI completo (contexto, alcance, docs, riesgos, SoA)
//   · Gerencia       → dashboard + aprobaciones (objetivos / alcance / docs)
//   · Auditor        → auditorías, hallazgos, NC + lectura del resto
//
// Las acciones siguen el patrón "<recurso>:<accion>" estilo CASL/Casbin.
// Recursos cubiertos hoy (HU01-HU05): usuario, organizacion, tenant.
// El resto queda en la matriz para sprints futuros.
// ────────────────────────────────────────────────────────────────────

export type Rol = "Administrador" | "CISO" | "Gerencia" | "Auditor";

export const ROLES: ReadonlyArray<Rol> = [
  "Administrador",
  "CISO",
  "Gerencia",
  "Auditor",
] as const;

export type Action = "read" | "create" | "update" | "delete" | "approve";
export type Resource =
  | "usuario"
  | "organizacion"
  | "tenant"
  | "sede"
  | "factor"
  | "parte"
  | "proceso"
  | "activo"
  | "rol_sgsi"
  | "documento"
  | "objetivo"
  | "aprobacion"
  | "escenario"
  | "riesgo"
  | "control_soa"
  | "auditoria"
  | "hallazgo"
  | "nc"
  | "revision_direccion"
  | "dashboard";

// Permission key format: "resource:action"
type PermissionKey = `${Resource}:${Action}` | `${Resource}:*` | "*";

const ALL: PermissionKey[] = ["*"];

const MATRIX: Record<Rol, ReadonlyArray<PermissionKey>> = {
  Administrador: ALL,

  CISO: [
    "dashboard:read",
    "organizacion:read",
    "organizacion:update",
    "sede:*",
    "factor:*",
    "parte:*",
    "proceso:*",
    "activo:*",
    "rol_sgsi:*",
    "documento:*",
    "objetivo:read",
    "objetivo:create",
    "objetivo:update",
    "escenario:*",
    "riesgo:*",
    "control_soa:*",
    "usuario:read",
    "aprobacion:read",
    "aprobacion:create",
    "auditoria:read",
    "hallazgo:read",
    "nc:read",
    "revision_direccion:read",
    "revision_direccion:create",
    "revision_direccion:update",
  ],

  Gerencia: [
    "dashboard:read",
    "organizacion:read",
    "sede:read",
    "factor:read",
    "parte:read",
    "proceso:read",
    "activo:read",
    "rol_sgsi:read",
    "documento:read",
    "objetivo:read",
    "escenario:read",
    "riesgo:read",
    "control_soa:read",
    "auditoria:read",
    "hallazgo:read",
    "nc:read",
    "revision_direccion:*",
    "aprobacion:read",
    "aprobacion:approve",
    "aprobacion:update",
  ],

  Auditor: [
    "dashboard:read",
    "organizacion:read",
    "sede:read",
    "factor:read",
    "parte:read",
    "proceso:read",
    "activo:read",
    "rol_sgsi:read",
    "documento:read",
    "objetivo:read",
    "escenario:read",
    "riesgo:read",
    "control_soa:read",
    "auditoria:*",
    "hallazgo:*",
    "nc:*",
    "revision_direccion:read",
  ],
};

export function can(rol: string | undefined | null, resource: Resource, action: Action): boolean {
  if (!rol || !(rol in MATRIX)) return false;
  const perms = MATRIX[rol as Rol];
  return (
    perms.includes("*") ||
    perms.includes(`${resource}:*` as PermissionKey) ||
    perms.includes(`${resource}:${action}` as PermissionKey)
  );
}

/** Server-side: lanza error si el rol no puede; pensado para API routes / server actions. */
export function assertCan(rol: string | undefined | null, resource: Resource, action: Action): void {
  if (!can(rol, resource, action)) {
    throw new ForbiddenError(`Acceso denegado: el rol "${rol ?? "anónimo"}" no puede ${action} ${resource}.`);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(msg: string) {
    super(msg);
    this.name = "ForbiddenError";
  }
}
