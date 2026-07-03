import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { vectorizeRecordSafe, deleteRecordVectors } from "@/lib/ai/embeddings";
import { chunkForActivo } from "@/lib/ai/chunk-text";

const NIVEL = ["alta", "media", "baja"] as const;
const VAL   = ["bajo", "medio", "alto", "crítico"] as const;

const updateSchema = z.object({
  nombre:           z.string().trim().min(2).max(180).optional(),
  tipo:             z.enum(["Información", "Software", "Hardware", "Personas", "Servicio"]).optional(),
  formato:          z.string().trim().min(1).max(40).optional(),
  ubicacion:        z.string().trim().min(2).max(200).optional(),
  clasificacion:    z.enum(["Público", "Interno", "Restringido", "Confidencial"]).optional(),
  confidencialidad: z.enum(NIVEL).optional(),
  integridad:       z.enum(NIVEL).optional(),
  disponibilidad:   z.enum(NIVEL).optional(),
  valoracion:       z.enum(VAL).optional(),
  modelo:           z.string().trim().max(180).optional(),
  version:          z.string().trim().max(180).optional(),
  proveedor:        z.string().trim().max(180).optional(),
  exposicion:       z.enum(["interna", "externa", "nube"]).optional(),
  estado:           z.enum(["activo", "inactivo"]).optional(),
  // M:N — fix feedback #2 (también se puede editar desde el activo)
  procesos_ids:     z.array(z.number().int()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("activo", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const { procesos_ids, ...data } = parsed.data;
  try {
    const existing = await prisma.activoInformacion.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
    }
    const activo = await prisma.activoInformacion.update({ where: { id }, data });
    if (procesos_ids !== undefined) {
      const owned = await prisma.proceso.findMany({
        where: { id: { in: procesos_ids }, organizacion_id: session.user.organizacion_id },
        select: { id: true },
      });
      await prisma.$transaction([
        prisma.procesoActivo.deleteMany({ where: { activo_informacion_id: id } }),
        prisma.procesoActivo.createMany({
          data: owned.map((p) => ({
            proceso_id: p.id,
            activo_informacion_id: id,
            tipo_relacion: "soporta",
            criticidad_relacion: "media",
          })),
          skipDuplicates: true,
        }),
      ]);
    }
    await vectorizeRecordSafe({
      organizacion_id: activo.organizacion_id,
      tabla_origen: "activo_informacion",
      registro_origen_id: activo.id,
      campo_origen: "nombre",
      chunk_texto: chunkForActivo(activo),
      metadata: { tipo: activo.tipo, anonimizado: activo.tipo === "Personas" },
    });
    return NextResponse.json({ activo });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el activo");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("activo", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await prisma.activoInformacion.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
    }
    await prisma.$transaction([
      prisma.procesoActivo.deleteMany({ where: { activo_informacion_id: id } }),
      prisma.activoInformacion.delete({ where: { id } }),
    ]);
    await deleteRecordVectors({
      organizacion_id: existing.organizacion_id,
      tabla_origen: "activo_informacion",
      registro_origen_id: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el activo");
  }
}
