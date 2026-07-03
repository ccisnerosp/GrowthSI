import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const updateSchema = z.object({
  nombre:            z.string().trim().min(2).max(150).optional(),
  tipo:              z.enum(["Individual", "Órgano colegiado"]).optional(),
  descripcion:       z.string().trim().min(5).optional(),
  responsabilidades: z.string().trim().min(5).optional(),
  autoridades:       z.string().trim().min(2).optional(),
  usuario_id:        z.number().int().positive().nullable().optional(),
  estado:            z.enum(["activo", "inactivo"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("rol_sgsi", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const orgId = session.user.organizacion_id;
  try {
    const existing = await prisma.rolSgsi.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== orgId) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
    }
    if (parsed.data.usuario_id != null) {
      const u = await prisma.usuario.findFirst({ where: { id: parsed.data.usuario_id, organizacion_id: orgId, deleted_at: null }, select: { id: true } });
      if (!u) return NextResponse.json({ error: "El usuario asignado no es válido." }, { status: 400 });
    }
    const rol = await prisma.rolSgsi.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ rol });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el rol del SGSI");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("rol_sgsi", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await prisma.rolSgsi.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
    }
    await prisma.rolSgsi.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el rol del SGSI");
  }
}
