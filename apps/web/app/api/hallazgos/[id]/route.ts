// M4 — editar / eliminar un hallazgo (la tabla no tiene deleted_at → hard delete).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const SEVERIDAD = ["menor", "mayor", "critica"] as const;
const ESTADOS = ["abierto", "cerrado"] as const;

const updateSchema = z.object({
  titulo:      z.string().trim().min(2).max(220).optional(),
  descripcion: z.string().trim().optional(),
  severidad:   z.enum(SEVERIDAD).optional(),
  estado:      z.enum(ESTADOS).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(id: number, orgId: number) {
  const h = await prisma.auditoriaHallazgo.findUnique({ where: { id }, include: { auditoria: { select: { organizacion_id: true, deleted_at: true } } } });
  if (!h || h.auditoria.organizacion_id !== orgId || h.auditoria.deleted_at) return null;
  return h;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("hallazgo", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    if (!await loadOwned(id, session.user.organizacion_id)) return NextResponse.json({ error: "Hallazgo no encontrado" }, { status: 404 });
    const hallazgo = await prisma.auditoriaHallazgo.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ hallazgo });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el hallazgo");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("hallazgo", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    if (!await loadOwned(id, session.user.organizacion_id)) return NextResponse.json({ error: "Hallazgo no encontrado" }, { status: 404 });
    await prisma.auditoriaHallazgo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el hallazgo");
  }
}
