import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { vectorizeRecordSafe, deleteRecordVectors } from "@/lib/ai/embeddings";
import { chunkForParte } from "@/lib/ai/chunk-text";

const updateSchema = z.object({
  nombre:                 z.string().trim().min(2).max(150).optional(),
  tipo:                   z.enum(["Interna", "Externa"]).optional(),
  expectativas:           z.string().trim().min(5).optional(),
  requisitos:             z.string().trim().min(5).optional(),
  relevancia:             z.enum(["alta", "media", "baja"]).optional(),
  contacto:               z.string().trim().max(150).optional(),
  frecuencia_interaccion: z.string().trim().min(2).max(80).optional(),
  responsable_interno:    z.string().trim().min(2).max(150).optional(),
  estado:                 z.enum(["activo", "inactivo"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("parte", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const existing = await prisma.partesInteresadas.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Parte interesada no encontrada" }, { status: 404 });
    }
    const parte = await prisma.partesInteresadas.update({ where: { id }, data: parsed.data });
    await vectorizeRecordSafe({
      organizacion_id: parte.organizacion_id,
      tabla_origen: "partes_interesadas",
      registro_origen_id: parte.id,
      campo_origen: "expectativas",
      chunk_texto: chunkForParte(parte),
    });
    return NextResponse.json({ parte });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la parte interesada");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("parte", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await prisma.partesInteresadas.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Parte interesada no encontrada" }, { status: 404 });
    }
    await prisma.partesInteresadas.delete({ where: { id } });
    await deleteRecordVectors({
      organizacion_id: existing.organizacion_id,
      tabla_origen: "partes_interesadas",
      registro_origen_id: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la parte interesada");
  }
}
