// Revisión por la Dirección — actualizar/eliminar una acción de mejora.
// El seguimiento de estas acciones es lo que CIERRA el ciclo: la próxima
// revisión las trae como insumo (estado de acciones previas, 9.3.2 a).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  descripcion: z.string().trim().min(3).max(2000).optional(),
  tipo: z.enum(["mejora", "cambio_control", "cambio_objetivo", "recurso", "politica", "otro"]).optional(),
  responsable_usuario_id: z.coerce.number().int().positive().nullable().optional(),
  prioridad: z.enum(["alta", "media", "baja"]).optional(),
  fecha_objetivo: z.string().nullable().optional(),
  estado: z.enum(["pendiente", "en_progreso", "hecho", "cancelada"]).optional(),
});

async function loadOwned(id: number, orgId: number) {
  const a = await prisma.revisionDireccionAccion.findUnique({
    where: { id }, include: { revision: { select: { organizacion_id: true, deleted_at: true } } },
  });
  if (!a || a.revision.deleted_at || a.revision.organizacion_id !== orgId) return null;
  return a;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("revision_direccion", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    const existing = await loadOwned(id, orgId);
    if (!existing) return NextResponse.json({ error: "Acción no encontrada" }, { status: 404 });

    // Al pasar a 'hecho' se sella la fecha de cierre; al reabrir, se limpia.
    let fecha_cierre = existing.fecha_cierre;
    if (d.estado === "hecho" && existing.estado !== "hecho") fecha_cierre = new Date();
    if (d.estado && d.estado !== "hecho") fecha_cierre = null;

    const accion = await prisma.revisionDireccionAccion.update({
      where: { id },
      data: {
        ...(d.descripcion !== undefined && { descripcion: d.descripcion }),
        ...(d.tipo !== undefined && { tipo: d.tipo }),
        ...(d.prioridad !== undefined && { prioridad: d.prioridad }),
        ...(d.estado !== undefined && { estado: d.estado }),
        ...(d.responsable_usuario_id !== undefined && { responsable_usuario_id: d.responsable_usuario_id }),
        ...(d.fecha_objetivo !== undefined && { fecha_objetivo: d.fecha_objetivo ? new Date(d.fecha_objetivo) : null }),
        fecha_cierre,
      },
    });
    return NextResponse.json({ accion });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la acción");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("revision_direccion", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await loadOwned(id, session.user.organizacion_id);
    if (!existing) return NextResponse.json({ error: "Acción no encontrada" }, { status: 404 });
    await prisma.revisionDireccionAccion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la acción");
  }
}
