// CRUD procesos — implicit.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForProceso } from "@/lib/ai/chunk-text";

const createSchema = z.object({
  nombre:           z.string().trim().min(2).max(180),
  tipo:             z.enum(["Estratégico", "Misional", "Soporte"]),
  area:             z.string().trim().min(2).max(100),
  criticidad:       z.enum(["alta", "media", "baja"]),
  kpis:             z.string().trim().min(2),
  descripcion:      z.string().trim().min(5),
  incluido_alcance: z.boolean().default(true),
  estado:           z.enum(["activo", "inactivo"]).default("activo"),
  // M:N opcional al crear
  activos_ids:      z.array(z.number().int()).optional(),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("proceso", "read");
  if (error) return error;
  const procesos = await prisma.proceso.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    orderBy: { id: "asc" },
    include: { activos: { include: { activo: { select: { id: true, codigo: true, nombre: true } } } } },
  });
  return NextResponse.json({ procesos });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("proceso", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const { activos_ids = [], ...data } = parsed.data;
  try {
    const existing = await prisma.proceso.findMany({ where: { organizacion_id: session.user.organizacion_id }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("PR", existing.map((r) => r.codigo));
    const proceso = await prisma.proceso.create({
      data: { organizacion_id: session.user.organizacion_id, codigo, ...data },
    });
    if (activos_ids.length > 0) {
      // Validar que los activos pertenezcan al mismo tenant antes de relacionar
      const owned = await prisma.activoInformacion.findMany({
        where: { id: { in: activos_ids }, organizacion_id: session.user.organizacion_id },
        select: { id: true },
      });
      await prisma.procesoActivo.createMany({
        data: owned.map((a) => ({
          proceso_id: proceso.id,
          activo_informacion_id: a.id,
          tipo_relacion: "utiliza",
          criticidad_relacion: "media",
        })),
      });
    }
    await vectorizeRecordSafe({
      organizacion_id: proceso.organizacion_id,
      tabla_origen: "proceso",
      registro_origen_id: proceso.id,
      campo_origen: "descripcion",
      chunk_texto: chunkForProceso(proceso),
    });
    return NextResponse.json({ proceso }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el proceso");
  }
}
