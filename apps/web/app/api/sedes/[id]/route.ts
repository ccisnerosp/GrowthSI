import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { vectorizeRecordSafe, deleteRecordVectors } from "@/lib/ai/embeddings";
import { chunkForSede } from "@/lib/ai/chunk-text";

const updateSchema = z.object({
  nombre_sede:       z.string().trim().min(2).max(150).optional(),
  pais_sede:         z.string().trim().min(2).max(80).optional(),
  departamento_sede: z.string().trim().min(2).max(80).optional(),
  provincia_sede:    z.string().trim().min(2).max(80).optional(),
  distrito_sede:     z.string().trim().min(2).max(80).optional(),
  incluido_alcance:  z.boolean().optional(),
  estado:            z.enum(["activo", "inactivo"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("sede", "update");
  if (error) return error;
  const { id } = await params;
  const sedeId = Number(id);
  if (!Number.isInteger(sedeId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const existing = await prisma.sede.findUnique({ where: { id: sedeId } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
    }

    const sede = await prisma.sede.update({
      where: { id: sedeId },
      data: parsed.data,
    });

    await vectorizeRecordSafe({
      organizacion_id: sede.organizacion_id,
      tabla_origen: "sede",
      registro_origen_id: sede.id,
      campo_origen: "nombre_sede",
      chunk_texto: chunkForSede(sede),
    });

    return NextResponse.json({ sede });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la sede");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("sede", "delete");
  if (error) return error;
  const { id } = await params;
  const sedeId = Number(id);
  if (!Number.isInteger(sedeId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const existing = await prisma.sede.findUnique({ where: { id: sedeId } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
    }
    await prisma.sede.delete({ where: { id: sedeId } });
    await deleteRecordVectors({
      organizacion_id: existing.organizacion_id,
      tabla_origen: "sede",
      registro_origen_id: sedeId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la sede");
  }
}
