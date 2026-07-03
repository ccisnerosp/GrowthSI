import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AppShell } from "@/app/_components/app-shell";
import { ContextoClient } from "./contexto-client";

// Carga server-side de las 6 entidades de Contexto I/E.
// Filtrado por organizacion_id (HU03 multitenant scoping).
export default async function ContextoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "organizacion", "read")) {
    redirect("/dashboard?forbidden=organizacion:read");
  }

  const orgId = session.user.organizacion_id;
  const [org, sedes, factores, partes, procesos, activos] = await Promise.all([
    prisma.organizacion.findUnique({
      where: { id: orgId },
      select: {
        id: true, codigo: true, nombre_organizacion: true, ruc: true, sector: true,
        numero_colaboradores: true, dominio: true, mision: true, vision: true,
        estado_sgsi: true, inicio_proyecto: true, estado: true,
      },
    }),
    prisma.sede.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.factor.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.partesInteresadas.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.proceso.findMany({
      where: { organizacion_id: orgId },
      orderBy: { id: "asc" },
      include: { activos: { include: { activo: { select: { id: true, codigo: true, nombre: true } } } } },
    }),
    prisma.activoInformacion.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
  ]);
  if (!org) redirect("/login");

  // Permisos para el cliente (UI guards)
  const perms = {
    org_update:    can(session.user.rol, "organizacion", "update"),
    sede_create:   can(session.user.rol, "sede", "create"),
    sede_update:   can(session.user.rol, "sede", "update"),
    sede_delete:   can(session.user.rol, "sede", "delete"),
    factor_create: can(session.user.rol, "factor", "create"),
    factor_update: can(session.user.rol, "factor", "update"),
    factor_delete: can(session.user.rol, "factor", "delete"),
    parte_create:  can(session.user.rol, "parte", "create"),
    parte_update:  can(session.user.rol, "parte", "update"),
    parte_delete:  can(session.user.rol, "parte", "delete"),
    proceso_create:can(session.user.rol, "proceso", "create"),
    proceso_update:can(session.user.rol, "proceso", "update"),
    proceso_delete:can(session.user.rol, "proceso", "delete"),
    activo_create: can(session.user.rol, "activo", "create"),
    activo_update: can(session.user.rol, "activo", "update"),
    activo_delete: can(session.user.rol, "activo", "delete"),
  };

  // Mapa activo_id → [proceso_ids] para que el modal de Activo sepa
  // a qué procesos está vinculado (fix feedback #2).
  const procesoActivoFlat = await prisma.procesoActivo.findMany({
    where: { proceso: { organizacion_id: orgId } },
    select: { proceso_id: true, activo_informacion_id: true },
  });
  const procesosByActivo = new Map<number, number[]>();
  for (const r of procesoActivoFlat) {
    const arr = procesosByActivo.get(r.activo_informacion_id) ?? [];
    arr.push(r.proceso_id);
    procesosByActivo.set(r.activo_informacion_id, arr);
  }

  return (
    <AppShell current="contexto">
      <ContextoClient
        sessionRol={session.user.rol}
        sessionNombre={session.user.nombre}
        orgInicial={{ ...org, inicio_proyecto: org.inicio_proyecto.toISOString().slice(0, 10) }}
        sedesInicial={sedes}
        factoresInicial={factores.map((f) => ({ ...f, fecha_identificacion: f.fecha_identificacion.toISOString().slice(0, 10) }))}
        partesInicial={partes}
        procesosInicial={procesos.map((p) => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          tipo: p.tipo,
          area: p.area,
          criticidad: p.criticidad,
          kpis: p.kpis,
          descripcion: p.descripcion,
          incluido_alcance: p.incluido_alcance,
          estado: p.estado,
          activos_ids: p.activos.map((pa) => pa.activo.id),
        }))}
        activosInicial={activos.map((a) => ({ ...a, procesos_ids: procesosByActivo.get(a.id) ?? [] }))}
        perms={perms}
      />
    </AppShell>
  );
}
