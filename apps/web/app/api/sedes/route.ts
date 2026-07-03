// CRUD sedes — implicit del módulo Contexto I/E.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForSede } from "@/lib/ai/chunk-text";

const createSchema = z.object({
  nombre_sede:       z.string().trim().min(2).max(150),
  pais_sede:         z.string().trim().min(2).max(80),
  departamento_sede: z.string().trim().min(2).max(80),
  provincia_sede:    z.string().trim().min(2).max(80),
  distrito_sede:     z.string().trim().min(2).max(80),
  incluido_alcance:  z.boolean().default(true),
  estado:            z.enum(["activo", "inactivo"]).default("activo"),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("sede", "read");
  if (error) return error;
  const sedes = await prisma.sede.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ sedes });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("sede", "create");
  if (error) return error;

  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  try {
    const existing = await prisma.sede.findMany({ where: { organizacion_id: session.user.organizacion_id }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("SED", existing.map((r) => r.codigo));

    const sede = await prisma.sede.create({
      data: { organizacion_id: session.user.organizacion_id, codigo, ...d },
    });

    // HU57 — vectorización síncrona
    await vectorizeRecordSafe({
      organizacion_id: sede.organizacion_id,
      tabla_origen: "sede",
      registro_origen_id: sede.id,
      campo_origen: "nombre_sede",
      chunk_texto: chunkForSede(sede),
    });

    return NextResponse.json({ sede }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la sede");
  }
}
