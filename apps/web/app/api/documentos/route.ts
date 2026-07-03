// HU19 — listar documentos. HU20 — registrar documento.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForDocumento } from "@/lib/ai/chunk-text";
import { sanitizeDocumentHtml } from "@/lib/sanitize-html";

const TIPOS = ["Política", "Procedimiento", "Plan", "Instructivo", "Registro", "Manual", "Control"] as const;

// Prefijo de código por tipo (ISO suele usar POL-, PRO-, PLN-, INS-, REG-, MAN-)
const PREFIJO: Record<string, string> = {
  "Política": "POL", "Procedimiento": "PRO", "Plan": "PLN",
  "Instructivo": "INS", "Registro": "REG", "Manual": "MAN", "Control": "CTL",
};

const createSchema = z.object({
  nombre:      z.string().trim().min(2).max(200),
  tipo:        z.enum(TIPOS),
  obligatorio: z.boolean().default(false),
  descripcion: z.string().trim().min(5),
  version:     z.string().trim().max(20).default("1.0"),
  contenido:   z.string().optional(),
  estado:      z.enum(["borrador", "revision", "aprobado"]).default("borrador"),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("documento", "read");
  if (error) return error;
  const documentos = await prisma.documento.findMany({
    where: { organizacion_id: session.user.organizacion_id, deleted_at: null },
    select: {
      id: true, codigo: true, nombre: true, tipo: true, obligatorio: true,
      descripcion: true, version: true, estado: true, archivo_url: true,
      created_at: true, updated_at: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ documentos });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("documento", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  if (d.contenido !== undefined) d.contenido = sanitizeDocumentHtml(d.contenido);
  try {
    const existing = await prisma.documento.findMany({
      where: { organizacion_id: session.user.organizacion_id },
      select: { codigo: true },
    });
    const codigo = nextCodeFromExisting(PREFIJO[d.tipo] ?? "DOC", existing.map((r) => r.codigo));

    const documento = await prisma.documento.create({
      data: { organizacion_id: session.user.organizacion_id, codigo, ...d },
    });

    await vectorizeRecordSafe({
      organizacion_id: documento.organizacion_id,
      tabla_origen: "documento",
      registro_origen_id: documento.id,
      campo_origen: "contenido",
      chunk_texto: chunkForDocumento(documento),
      metadata: { tipo: documento.tipo, obligatorio: documento.obligatorio },
    });

    return NextResponse.json({ documento }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el documento");
  }
}
