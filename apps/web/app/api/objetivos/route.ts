// HU15/HU16/HU17 — CRUD objetivo_sgsi.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";

const createSchema = z.object({
  nombre:      z.string().trim().min(2).max(180),
  descripcion: z.string().trim().min(5),
  indicador:   z.string().trim().min(2).max(180),
  meta:        z.string().trim().min(1).max(120),
  estado:      z.enum(["activo", "en_curso", "aprobado", "cumplido", "inactivo"]).default("activo"),
  // P2 — meta medible (9.1). Opcionales: si no hay meta_valor, el objetivo es cualitativo.
  meta_valor:    z.coerce.number().nullable().optional(),
  meta_operador: z.enum([">=", "<=", "=", ">", "<"]).default(">="),
  unidad:        z.string().trim().max(40).nullable().optional(),
  frecuencia:    z.enum(["mensual", "trimestral", "semestral", "anual"]).nullable().optional(),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("objetivo", "read");
  if (error) return error;
  const objetivos = await prisma.objetivoSgsi.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ objetivos });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("objetivo", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const existing = await prisma.objetivoSgsi.findMany({ where: { organizacion_id: session.user.organizacion_id }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("OBJ", existing.map((r) => r.codigo));
    const objetivo = await prisma.objetivoSgsi.create({
      data: { organizacion_id: session.user.organizacion_id, codigo, ...parsed.data },
    });
    return NextResponse.json({ objetivo }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el objetivo");
  }
}
