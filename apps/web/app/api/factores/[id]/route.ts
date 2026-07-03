// HU07 — Editar factor. + DELETE.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { vectorizeRecordSafe, deleteRecordVectors } from "@/lib/ai/embeddings";
import { chunkForFactor } from "@/lib/ai/chunk-text";

const updateSchema = z.object({
  origen:               z.enum(["Externo", "Interno"]).optional(),
  categoria:            z.string().trim().min(2).max(80).optional(),
  tipo:                 z.enum(["Amenaza", "Oportunidad", "Fortaleza", "Debilidad"]).optional(),
  descripcion:          z.string().trim().min(10).optional(),
  impacto:              z.enum(["bajo", "medio", "alto", "crítico"]).optional(),
  fecha_identificacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estado:               z.enum(["activo", "inactivo"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("factor", "update");
  if (error) return error;
  const factorId = Number((await params).id);
  if (!Number.isInteger(factorId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  try {
    const existing = await prisma.factor.findUnique({ where: { id: factorId } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Factor no encontrado" }, { status: 404 });
    }
    const factor = await prisma.factor.update({
      where: { id: factorId },
      data: {
        ...d,
        ...(d.fecha_identificacion && { fecha_identificacion: new Date(d.fecha_identificacion + "T00:00:00Z") }),
      },
    });
    await vectorizeRecordSafe({
      organizacion_id: factor.organizacion_id,
      tabla_origen: "factor",
      registro_origen_id: factor.id,
      campo_origen: "descripcion",
      chunk_texto: chunkForFactor(factor),
    });
    return NextResponse.json({ factor });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el factor");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("factor", "delete");
  if (error) return error;
  const factorId = Number((await params).id);
  if (!Number.isInteger(factorId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await prisma.factor.findUnique({ where: { id: factorId } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Factor no encontrado" }, { status: 404 });
    }
    await prisma.factor.delete({ where: { id: factorId } });
    await deleteRecordVectors({
      organizacion_id: existing.organizacion_id,
      tabla_origen: "factor",
      registro_origen_id: factorId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el factor");
  }
}
