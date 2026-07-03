// HU09 — Registrar activos de información.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForActivo } from "@/lib/ai/chunk-text";

const NIVEL = ["alta", "media", "baja"] as const;
const VAL   = ["bajo", "medio", "alto", "crítico"] as const;

const createSchema = z.object({
  nombre:           z.string().trim().min(2).max(180),
  tipo:             z.enum(["Información", "Software", "Hardware", "Personas", "Servicio"]),
  formato:          z.string().trim().min(1).max(40),
  ubicacion:        z.string().trim().min(2).max(200),
  clasificacion:    z.enum(["Público", "Interno", "Restringido", "Confidencial"]),
  confidencialidad: z.enum(NIVEL),
  integridad:       z.enum(NIVEL),
  disponibilidad:   z.enum(NIVEL),
  valoracion:       z.enum(VAL),
  modelo:           z.string().trim().max(180).default(""),
  version:          z.string().trim().max(180).default(""),
  proveedor:        z.string().trim().max(180).default(""),
  exposicion:       z.enum(["interna", "externa", "nube"]).default("interna"),
  estado:           z.enum(["activo", "inactivo"]).default("activo"),
  // M:N — procesos a los que da soporte (fix feedback #2)
  procesos_ids:     z.array(z.number().int()).optional(),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("activo", "read");
  if (error) return error;
  const activos = await prisma.activoInformacion.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ activos });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("activo", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const { procesos_ids = [], ...data } = parsed.data;
  try {
    const existing = await prisma.activoInformacion.findMany({ where: { organizacion_id: session.user.organizacion_id }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("AI", existing.map((r) => r.codigo));
    const activo = await prisma.activoInformacion.create({
      data: { organizacion_id: session.user.organizacion_id, codigo, ...data },
    });
    // M:N — vincular activo con los procesos seleccionados (mismo tenant)
    if (procesos_ids.length > 0) {
      const owned = await prisma.proceso.findMany({
        where: { id: { in: procesos_ids }, organizacion_id: session.user.organizacion_id },
        select: { id: true },
      });
      await prisma.procesoActivo.createMany({
        data: owned.map((p) => ({
          proceso_id: p.id,
          activo_informacion_id: activo.id,
          tipo_relacion: "soporta",
          criticidad_relacion: "media",
        })),
        skipDuplicates: true,
      });
    }
    await vectorizeRecordSafe({
      organizacion_id: activo.organizacion_id,
      tabla_origen: "activo_informacion",
      registro_origen_id: activo.id,
      campo_origen: "nombre",
      chunk_texto: chunkForActivo(activo),
      metadata: { tipo: activo.tipo, anonimizado: activo.tipo === "Personas" },
    });
    return NextResponse.json({ activo }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el activo");
  }
}
