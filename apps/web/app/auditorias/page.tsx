import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AppShell } from "@/app/_components/app-shell";
import { checkCompletitud, type Insumos } from "@/lib/revision-direccion-insumos";
import { AuditoriasClient } from "./auditorias-client";

// M4 — Cláusula 9 (Evaluación del desempeño): auditorías + hallazgos (9.2) y
// Revisión por la Dirección (9.3, acoplada como pestaña).
export default async function AuditoriasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "auditoria", "read")) redirect("/dashboard?forbidden=auditoria:read");

  const orgId = session.user.organizacion_id;
  const [auditorias, revisiones, usuarios] = await Promise.all([
    prisma.auditoria.findMany({
      where: { organizacion_id: orgId, deleted_at: null },
      orderBy: { fecha_inicio: "desc" },
      include: { hallazgos: { orderBy: { id: "asc" } } },
    }),
    prisma.revisionDireccion.findMany({
      where: { organizacion_id: orgId, deleted_at: null },
      orderBy: { fecha_revision: "desc" },
      select: {
        id: true, codigo: true, fecha_revision: true, periodo_desde: true, periodo_hasta: true,
        asistentes: true, conclusiones: true, estado: true, insumos_snapshot: true,
        creado_por: { select: { nombre: true } }, aprobado_por: { select: { nombre: true } }, aprobado_at: true,
        documento: { select: { id: true, codigo: true, nombre: true } },
        acciones: {
          orderBy: { id: "asc" },
          select: { id: true, descripcion: true, tipo: true, prioridad: true, estado: true, fecha_objetivo: true, fecha_cierre: true, responsable: { select: { nombre: true } } },
        },
      },
    }),
    prisma.usuario.findMany({ where: { organizacion_id: orgId, deleted_at: null }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  const perms = {
    aud_create: can(session.user.rol, "auditoria", "create"),
    aud_update: can(session.user.rol, "auditoria", "update"),
    aud_delete: can(session.user.rol, "auditoria", "delete"),
    hal_create: can(session.user.rol, "hallazgo", "create"),
    hal_update: can(session.user.rol, "hallazgo", "update"),
    hal_delete: can(session.user.rol, "hallazgo", "delete"),
    rev_read: can(session.user.rol, "revision_direccion", "read"),
    rev_create: can(session.user.rol, "revision_direccion", "create"),
    rev_update: can(session.user.rol, "revision_direccion", "update"),
    rev_approve: can(session.user.rol, "revision_direccion", "approve"),
    rev_delete: can(session.user.rol, "revision_direccion", "delete"),
  };

  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : null);
  const revisionesOut = revisiones.map((r) => {
    const ins = (r.insumos_snapshot as unknown as Insumos | null) ?? null;
    return {
      id: r.id, codigo: r.codigo, fecha_revision: d(r.fecha_revision)!, periodo_desde: d(r.periodo_desde)!, periodo_hasta: d(r.periodo_hasta)!,
      asistentes: r.asistentes, conclusiones: r.conclusiones, estado: r.estado,
      insumos: ins, completitud: ins ? checkCompletitud(ins) : [],
      creado_por: r.creado_por?.nombre ?? null, aprobado_por: r.aprobado_por?.nombre ?? null, aprobado_at: d(r.aprobado_at),
      documento: r.documento,
      acciones: r.acciones.map((a) => ({
        id: a.id, descripcion: a.descripcion, tipo: a.tipo, prioridad: a.prioridad, estado: a.estado,
        fecha_objetivo: d(a.fecha_objetivo), fecha_cierre: d(a.fecha_cierre), responsable: a.responsable?.nombre ?? null,
      })),
    };
  });

  const auditoriasOut = auditorias.map((a) => ({
    id: a.id, codigo: a.codigo, nombre: a.nombre, tipo: a.tipo, alcance: a.alcance,
    fecha_inicio: a.fecha_inicio.toISOString().slice(0, 10),
    fecha_fin: a.fecha_fin.toISOString().slice(0, 10),
    fecha_vencimiento: a.fecha_vencimiento.toISOString().slice(0, 10),
    estado: a.estado,
    hallazgos: a.hallazgos.map((h) => ({
      id: h.id, auditoria_id: h.auditoria_id, codigo: h.codigo, titulo: h.titulo,
      descripcion: h.descripcion, severidad: h.severidad, estado: h.estado,
    })),
  }));

  const ahora = new Date();

  return (
    <AppShell current="auditorias">
      <AuditoriasClient
        sessionRol={session.user.rol}
        anio={ahora.getFullYear()}
        hoy={ahora.toISOString().slice(0, 10)}
        auditoriasInicial={auditoriasOut}
        revisionesInicial={revisionesOut}
        usuarios={usuarios}
        perms={perms}
      />
    </AppShell>
  );
}
