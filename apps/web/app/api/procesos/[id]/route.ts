import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { vectorizeRecordSafe, deleteRecordVectors } from "@/lib/ai/embeddings";
import { chunkForProceso } from "@/lib/ai/chunk-text";

const updateSchema = z.object({
  nombre:           z.string().trim().min(2).max(180).optional(),
  tipo:             z.enum(["Estratégico", "Misional", "Soporte"]).optional(),
  area:             z.string().trim().min(2).max(100).optional(),
  criticidad:       z.enum(["alta", "media", "baja"]).optional(),
  kpis:             z.string().trim().min(2).optional(),
  descripcion:      z.string().trim().min(5).optional(),
  incluido_alcance: z.boolean().optional(),
  estado:           z.enum(["activo", "inactivo"]).optional(),
  activos_ids:      z.array(z.number().int()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("proceso", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const { activos_ids, ...data } = parsed.data;
  try {
    const existing = await prisma.proceso.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
    }
    const proceso = await prisma.proceso.update({ where: { id }, data });
    if (activos_ids !== undefined) {
      const owned = await prisma.activoInformacion.findMany({
        where: { id: { in: activos_ids }, organizacion_id: session.user.organizacion_id },
        select: { id: true },
      });
      await prisma.$transaction([
        prisma.procesoActivo.deleteMany({ where: { proceso_id: id } }),
        prisma.procesoActivo.createMany({
          data: owned.map((a) => ({
            proceso_id: id,
            activo_informacion_id: a.id,
            tipo_relacion: "utiliza",
            criticidad_relacion: "media",
          })),
        }),
      ]);
    }
    await vectorizeRecordSafe({
      organizacion_id: proceso.organizacion_id,
      tabla_origen: "proceso",
      registro_origen_id: proceso.id,
      campo_origen: "descripcion",
      chunk_texto: chunkForProceso(proceso),
    });
    return NextResponse.json({ proceso });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el proceso");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("proceso", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await prisma.proceso.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
    }
    await prisma.$transaction([
      prisma.procesoActivo.deleteMany({ where: { proceso_id: id } }),
      prisma.proceso.delete({ where: { id } }),
    ]);
    await deleteRecordVectors({
      organizacion_id: existing.organizacion_id,
      tabla_origen: "proceso",
      registro_origen_id: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el proceso");
  }
}
