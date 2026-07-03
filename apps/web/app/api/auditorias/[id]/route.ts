// M4 — editar / eliminar (soft) una auditoría.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const TIPOS = ["Interna", "Externa", "Tercero"] as const;
const ESTADOS = ["planificada", "en-curso", "completada"] as const;
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const updateSchema = z.object({
  nombre:            z.string().trim().min(2).max(200).optional(),
  tipo:              z.enum(TIPOS).optional(),
  alcance:           z.string().trim().min(2).optional(),
  fecha_inicio:      DATE.optional(),
  fecha_fin:         DATE.optional(),
  fecha_vencimiento: DATE.optional(),
  estado:            z.enum(ESTADOS).optional(),
});

type Ctx = { params: Promise<{ id: string }> };
const d2 = (s: string) => new Date(s + "T00:00:00Z");

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("auditoria", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const prev = await prisma.auditoria.findUnique({ where: { id } });
    if (!prev || prev.organizacion_id !== session.user.organizacion_id || prev.deleted_at) {
      return NextResponse.json({ error: "Auditoría no encontrada" }, { status: 404 });
    }
    const auditoria = await prisma.auditoria.update({
      where: { id },
      data: {
        ...(d.nombre !== undefined && { nombre: d.nombre }),
        ...(d.tipo !== undefined && { tipo: d.tipo }),
        ...(d.alcance !== undefined && { alcance: d.alcance }),
        ...(d.fecha_inicio !== undefined && { fecha_inicio: d2(d.fecha_inicio) }),
        ...(d.fecha_fin !== undefined && { fecha_fin: d2(d.fecha_fin) }),
        ...(d.fecha_vencimiento !== undefined && { fecha_vencimiento: d2(d.fecha_vencimiento) }),
        ...(d.estado !== undefined && { estado: d.estado }),
      },
    });
    return NextResponse.json({ auditoria });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la auditoría");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("auditoria", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const prev = await prisma.auditoria.findUnique({ where: { id } });
    if (!prev || prev.organizacion_id !== session.user.organizacion_id || prev.deleted_at) {
      return NextResponse.json({ error: "Auditoría no encontrada" }, { status: 404 });
    }
    await prisma.auditoria.update({ where: { id }, data: { deleted_at: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la auditoría");
  }
}
