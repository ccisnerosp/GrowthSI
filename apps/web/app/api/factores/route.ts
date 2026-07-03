// HU06 — Registrar factor. HU07 — Editar. HU08 — Listar.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForFactor } from "@/lib/ai/chunk-text";

const ORIGEN  = ["Externo", "Interno"] as const;
const TIPO    = ["Amenaza", "Oportunidad", "Fortaleza", "Debilidad"] as const;
const IMPACTO = ["bajo", "medio", "alto", "crítico"] as const;

const createSchema = z.object({
  origen:               z.enum(ORIGEN),
  categoria:            z.string().trim().min(2).max(80),
  tipo:                 z.enum(TIPO),
  descripcion:          z.string().trim().min(10),
  impacto:              z.enum(IMPACTO),
  fecha_identificacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estado:               z.enum(["activo", "inactivo"]).default("activo"),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("factor", "read");
  if (error) return error;
  const factores = await prisma.factor.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ factores });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("factor", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const existing = await prisma.factor.findMany({ where: { organizacion_id: session.user.organizacion_id }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("F", existing.map((r) => r.codigo));
    const factor = await prisma.factor.create({
      data: {
        organizacion_id: session.user.organizacion_id,
        codigo,
        ...d,
        fecha_identificacion: new Date(d.fecha_identificacion + "T00:00:00Z"),
      },
    });
    await vectorizeRecordSafe({
      organizacion_id: factor.organizacion_id,
      tabla_origen: "factor",
      registro_origen_id: factor.id,
      campo_origen: "descripcion",
      chunk_texto: chunkForFactor(factor),
    });
    return NextResponse.json({ factor }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el factor");
  }
}
