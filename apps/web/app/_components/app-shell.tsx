// App shell con sidebar persistente — replica el diseño de Claude Design.
// Server component que carga sesión + datos del tenant y los pasa al cliente.

import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can, type Action, type Resource } from "@/lib/rbac";
import { AppShellClient, type NavItem, type SessionInfo, type TenantInfo } from "./app-shell-client";

// Definición de los módulos del SGSI (igual que el prototipo del usuario).
// 'available' indica si la página existe; el resto se muestra como
// "Próximos sprints" para señalar el roadmap sin desorientar al usuario.
const NAV_DEFINITION: Array<{
  id: string;
  href: string;
  label: string;
  module: string;
  icon: NavItem["icon"];
  resource: Resource;
  action: Action;
  available: boolean;
}> = [
  { id: "dashboard",  href: "/dashboard", label: "Dashboard",          module: "M5", icon: "dashboard", resource: "dashboard",    action: "read", available: true  },
  { id: "contexto",   href: "/contexto",  label: "Contexto I/E",       module: "M1", icon: "layers",    resource: "organizacion", action: "read", available: true  },
  { id: "alcance",    href: "/alcance",   label: "Alcance SGSI",       module: "M1", icon: "target",    resource: "organizacion", action: "read", available: true  },
  { id: "documentos", href: "/documentos",label: "Documentos",         module: "M2", icon: "doc",       resource: "documento",    action: "read", available: true  },
  { id: "riesgos",    href: "/riesgos",   label: "Riesgos",            module: "M3", icon: "alert",     resource: "riesgo",       action: "read", available: true  },
  { id: "soa",        href: "/soa",       label: "Controles",          module: "M3", icon: "shield",    resource: "control_soa",  action: "read", available: true  },
  { id: "auditorias", href: "/auditorias",label: "Auditorías",         module: "M4", icon: "clipboard", resource: "auditoria",    action: "read", available: true  },
  { id: "nc",         href: "/nc",        label: "No Conformidades",   module: "M4", icon: "flag",      resource: "nc",           action: "read", available: true  },
  { id: "usuarios",   href: "/usuarios",  label: "Usuarios",           module: "M6", icon: "users",     resource: "usuario",      action: "read", available: true  },
];

type ShellProps = {
  current: string;
  children: ReactNode;
};

export async function AppShell({ current, children }: ShellProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organizacion.findUnique({
    where: { id: session.user.organizacion_id },
    select: {
      id: true, codigo: true, nombre_organizacion: true, sector: true, ruc: true,
      numero_colaboradores: true,
      tenant: { select: { id: true, plan: true } },
    },
  });
  if (!org) redirect("/login");

  // Filtrar módulos por permiso del rol
  const nav: NavItem[] = NAV_DEFINITION
    .filter((n) => can(session.user.rol, n.resource, n.action))
    .map((n) => ({ id: n.id, href: n.href, label: n.label, module: n.module, icon: n.icon, available: n.available }));

  const sessionInfo: SessionInfo = {
    nombre: session.user.nombre,
    correo: session.user.correo,
    rol: session.user.rol,
  };
  const tenantInfo: TenantInfo = {
    organizacion_id: org.id,
    codigo: org.codigo,
    nombre: org.nombre_organizacion,
    sector: org.sector,
    ruc: org.ruc,
    colaboradores: org.numero_colaboradores,
    tenant_id: org.tenant.id,
    plan: org.tenant.plan,
  };

  return (
    <AppShellClient nav={nav} current={current} session={sessionInfo} tenant={tenantInfo}>
      {children}
    </AppShellClient>
  );
}
