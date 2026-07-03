// Actividad de implementación de un control: editar (estado/descripcion/fecha/
// responsable) y eliminar. Org-scoped vía control_soa. Permiso: control_soa:update.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const ESTADOS = ["pendiente", "en_progreso", "hecho"] as const;

const updateSchema = z.object({
  descripcion:            z.string().trim().min(2).max(500).optional(),
  estado:                 z.enum(ESTADOS).optional(),
  responsable_usuario_id: z.number().int().positive().nullable().optional(),
  fecha_objetivo:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

// Comprueba que la actividad pertenece al tenant (vía su control_soa).
async function actividadDelTenant(actId: number, orgId: number) {
  return prisma.controlActividad.findFirst({
    where: { id: actId, control_soa: { organizacion_id: orgId } },
    select: { id: true },
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("control_soa", "update");
  if (error) return error;
  const actId = Number((await params).id);
  if (!Number.isInteger(actId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    if (!(await actividadDelTenant(actId, orgId))) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    }
    if (typeof d.responsable_usuario_id === "number") {
      const u = await prisma.usuario.findFirst({ where: { id: d.responsable_usuario_id, organizacion_id: orgId, deleted_at: null }, select: { id: true } });
      if (!u) return NextResponse.json({ error: "Usuario responsable no encontrado" }, { status: 404 });
    }
    const actividad = await prisma.controlActividad.update({
      where: { id: actId },
      data: {
        ...(d.descripcion !== undefined && { descripcion: d.descripcion }),
        ...(d.estado !== undefined && { estado: d.estado }),
        ...(d.responsable_usuario_id !== undefined && { responsable_usuario_id: d.responsable_usuario_id }),
        ...(d.fecha_objetivo !== undefined && { fecha_objetivo: d.fecha_objetivo ? new Date(d.fecha_objetivo + "T00:00:00Z") : null }),
      },
    });
    return NextResponse.json({ actividad });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la actividad");
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("control_soa", "update");
  if (error) return error;
  const actId = Number((await params).id);
  if (!Number.isInteger(actId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const orgId = session.user.organizacion_id;

  try {
    if (!(await actividadDelTenant(actId, orgId))) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    }
    await prisma.controlActividad.delete({ where: { id: actId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la actividad");
  }
}
