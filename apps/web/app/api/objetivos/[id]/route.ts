import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const updateSchema = z.object({
  nombre:      z.string().trim().min(2).max(180).optional(),
  descripcion: z.string().trim().min(5).optional(),
  indicador:   z.string().trim().min(2).max(180).optional(),
  meta:        z.string().trim().min(1).max(120).optional(),
  estado:      z.enum(["activo", "en_curso", "aprobado", "cumplido", "inactivo"]).optional(),
  // P2 — meta medible (9.1).
  meta_valor:    z.coerce.number().nullable().optional(),
  meta_operador: z.enum([">=", "<=", "=", ">", "<"]).optional(),
  unidad:        z.string().trim().max(40).nullable().optional(),
  frecuencia:    z.enum(["mensual", "trimestral", "semestral", "anual"]).nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("objetivo", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const existing = await prisma.objetivoSgsi.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
    }
    const objetivo = await prisma.objetivoSgsi.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ objetivo });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el objetivo");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("objetivo", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await prisma.objetivoSgsi.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
    }
    await prisma.objetivoSgsi.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el objetivo");
  }
}
