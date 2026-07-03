// CRUD partes interesadas — implicit.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForParte } from "@/lib/ai/chunk-text";

const createSchema = z.object({
  nombre:                 z.string().trim().min(2).max(150),
  tipo:                   z.enum(["Interna", "Externa"]),
  expectativas:           z.string().trim().min(5),
  requisitos:             z.string().trim().min(5),
  relevancia:             z.enum(["alta", "media", "baja"]),
  contacto:               z.string().trim().max(150).default(""),
  frecuencia_interaccion: z.string().trim().min(2).max(80),
  responsable_interno:    z.string().trim().min(2).max(150),
  estado:                 z.enum(["activo", "inactivo"]).default("activo"),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("parte", "read");
  if (error) return error;
  const partes = await prisma.partesInteresadas.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ partes });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("parte", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const existing = await prisma.partesInteresadas.findMany({ where: { organizacion_id: session.user.organizacion_id }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("PI", existing.map((r) => r.codigo));
    const parte = await prisma.partesInteresadas.create({
      data: { organizacion_id: session.user.organizacion_id, codigo, ...parsed.data },
    });
    await vectorizeRecordSafe({
      organizacion_id: parte.organizacion_id,
      tabla_origen: "partes_interesadas",
      registro_origen_id: parte.id,
      campo_origen: "expectativas",
      chunk_texto: chunkForParte(parte),
    });
    return NextResponse.json({ parte }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la parte interesada");
  }
}
