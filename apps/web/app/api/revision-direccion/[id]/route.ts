// Revisión por la Dirección (9.3) — detalle / editar / recalcular insumos /
// aprobar / eliminar.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { parseBody, apiError } from "@/lib/api-helpers";
import { computeInsumos } from "@/lib/revision-direccion-insumos";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(id: number, orgId: number) {
  const r = await prisma.revisionDireccion.findUnique({ where: { id } });
  if (!r || r.deleted_at || r.organizacion_id !== orgId) return null;
  return r;
}

const updateSchema = z.object({
  accion: z.enum(["recalcular", "aprobar"]).optional(),
  asistentes: z.string().trim().optional(),
  conclusiones: z.string().trim().optional(),
  fecha_revision: z.string().optional(),
  periodo_desde: z.string().optional(),
  periodo_hasta: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("revision_direccion", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    const existing = await loadOwned(id, orgId);
    if (!existing) return NextResponse.json({ error: "Revisión no encontrada" }, { status: 404 });
    if (existing.estado === "aprobada") {
      return NextResponse.json({ error: "La revisión ya está aprobada; no se puede modificar." }, { status: 409 });
    }

    if (d.accion === "aprobar") {
      if (!can(session.user.rol, "revision_direccion", "approve")) {
        return NextResponse.json({ error: "Tu rol no puede aprobar la revisión por la dirección." }, { status: 403 });
      }
      const revision = await prisma.revisionDireccion.update({
        where: { id },
        data: { estado: "aprobada", aprobado_por_usuario_id: session.user.userId, aprobado_at: new Date() },
      });
      return NextResponse.json({ revision });
    }

    if (d.accion === "recalcular") {
      const desde = d.periodo_desde ? new Date(d.periodo_desde) : existing.periodo_desde;
      const hasta = d.periodo_hasta ? new Date(d.periodo_hasta) : existing.periodo_hasta;
      const insumos = await computeInsumos(orgId, desde, hasta);
      const revision = await prisma.revisionDireccion.update({
        where: { id }, data: { periodo_desde: desde, periodo_hasta: hasta, insumos_snapshot: insumos },
      });
      return NextResponse.json({ revision });
    }

    const revision = await prisma.revisionDireccion.update({
      where: { id },
      data: {
        ...(d.asistentes !== undefined && { asistentes: d.asistentes }),
        ...(d.conclusiones !== undefined && { conclusiones: d.conclusiones }),
        ...(d.fecha_revision !== undefined && { fecha_revision: new Date(d.fecha_revision) }),
      },
    });
    return NextResponse.json({ revision });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la revisión");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("revision_direccion", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await loadOwned(id, session.user.organizacion_id);
    if (!existing) return NextResponse.json({ error: "Revisión no encontrada" }, { status: 404 });
    await prisma.revisionDireccion.update({ where: { id }, data: { deleted_at: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la revisión");
  }
}
