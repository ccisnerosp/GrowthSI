// HU21 — ver contenido. HU22 — actualizar (con snapshot a historial). DELETE.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { vectorizeRecordSafe, deleteRecordVectors } from "@/lib/ai/embeddings";
import { chunkForDocumento } from "@/lib/ai/chunk-text";
import { sanitizeDocumentHtml } from "@/lib/sanitize-html";

const updateSchema = z.object({
  nombre:         z.string().trim().min(2).max(200).optional(),
  tipo:           z.enum(["Política", "Procedimiento", "Plan", "Instructivo", "Registro", "Manual", "Control"]).optional(),
  obligatorio:    z.boolean().optional(),
  descripcion:    z.string().trim().min(5).optional(),
  version:        z.string().trim().max(20).optional(),
  contenido:      z.string().optional(),
  estado:         z.enum(["borrador", "revision", "aprobado"]).optional(),
  cambio_resumen: z.string().trim().max(500).optional(), // comentario del cambio (HU24)
  // Vínculo al catálogo de información documentada obligatoria (null = desvincular).
  obligatorio_id: z.number().int().positive().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

// HU21 — leer un documento completo (incluye contenido editable)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("documento", "read");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento || documento.organizacion_id !== session.user.organizacion_id || documento.deleted_at) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ documento });
}

// HU22 — actualizar. Antes de aplicar, snapshot del estado actual en historial (HU24).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("documento", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const { cambio_resumen, ...data } = parsed.data;
  // Seguridad: el HTML del editor se sanea antes de persistir (anti-XSS).
  if (data.contenido !== undefined) data.contenido = sanitizeDocumentHtml(data.contenido);
  // Vincular a un ítem obligatorio sincroniza el flag `obligatorio`.
  const linkData: { obligatorio_id?: number | null; obligatorio?: boolean } = {};
  if (data.obligatorio_id !== undefined) { linkData.obligatorio_id = data.obligatorio_id; linkData.obligatorio = data.obligatorio_id != null; delete (data as { obligatorio_id?: unknown }).obligatorio_id; }

  try {
    const prev = await prisma.documento.findUnique({ where: { id } });
    if (!prev || prev.organizacion_id !== session.user.organizacion_id || prev.deleted_at) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }
    if (linkData.obligatorio_id != null) {
      const item = await prisma.documentoObligatorio.findUnique({ where: { id: linkData.obligatorio_id }, select: { modulo: true } });
      if (!item || item.modulo !== "documentos") {
        return NextResponse.json({ error: "Ítem obligatorio inválido para vincular un documento." }, { status: 400 });
      }
    }

    // Snapshot del estado ANTERIOR + update, en una transacción (HU24 trazabilidad)
    const documento = await prisma.$transaction(async (tx) => {
      await tx.documentoHistorial.create({
        data: {
          documento_id: prev.id,
          version: prev.version,
          nombre: prev.nombre,
          estado: prev.estado,
          contenido: prev.contenido,
          cambio_resumen: cambio_resumen ?? null,
          usuario_id: session.user.userId,
        },
      });
      return tx.documento.update({ where: { id }, data: { ...data, ...linkData } });
    });

    await vectorizeRecordSafe({
      organizacion_id: documento.organizacion_id,
      tabla_origen: "documento",
      registro_origen_id: documento.id,
      campo_origen: "contenido",
      chunk_texto: chunkForDocumento(documento),
      metadata: { tipo: documento.tipo, obligatorio: documento.obligatorio },
    });

    return NextResponse.json({ documento });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el documento");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("documento", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const prev = await prisma.documento.findUnique({ where: { id } });
    if (!prev || prev.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }
    // Soft-delete (el esquema tiene deleted_at) — conserva el historial.
    await prisma.documento.update({ where: { id }, data: { deleted_at: new Date() } });
    await deleteRecordVectors({
      organizacion_id: prev.organizacion_id,
      tabla_origen: "documento",
      registro_origen_id: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el documento");
  }
}
