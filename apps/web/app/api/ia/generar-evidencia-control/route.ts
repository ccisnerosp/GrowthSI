// SoA — Generar el DOCUMENTO DE EVIDENCIA de un control que aplica y no tiene evidencia.
//
// Crea un Documento (tipo 'Control') con contenido generado por IA según la guía
// ISO/IEC 27002:2022 (RAG), lo vectoriza, y lo enlaza como evidencia del control en
// la SoA. El bulk lo orquesta el cliente llamando esta ruta por cada control faltante.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { recordUsage, assertWithinTokenLimit } from "@/lib/ai/usage";
import { assertRateLimit, RateLimitError } from "@/lib/ai/rate-limit";
import { apiError, parseBody, nextCodeFromExisting } from "@/lib/api-helpers";
import { aiClient, AiServiceError } from "@/lib/ai-client";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForDocumento } from "@/lib/ai/chunk-text";
import { sanitizeDocumentHtml } from "@/lib/sanitize-html";

const schema = z.object({ control_anexo_a_id: z.number().int().positive() });

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("control_soa", "update");
  if (error) return error;
  const orgId = session.user.organizacion_id;
  const userId = session.user.userId;

  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { control_anexo_a_id } = parsed.data;

  try {
    assertRateLimit(userId);
    await assertWithinTokenLimit(orgId);

    const [org, control, soa] = await Promise.all([
      prisma.organizacion.findUnique({
        where: { id: orgId },
        select: { nombre_organizacion: true, sector: true, numero_colaboradores: true, mision: true, vision: true, estado_sgsi: true, alcance_sgsi: true },
      }),
      prisma.controlAnexoA.findUnique({ where: { id: control_anexo_a_id }, select: { id: true, codigo: true, nombre: true, descripcion: true } }),
      prisma.controlSoa.findUnique({
        where: { control_anexo_a_id_organizacion_id: { control_anexo_a_id, organizacion_id: orgId } },
        select: { id: true, aplica: true, estado: true, evidencia_documento_id: true },
      }),
    ]);
    if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    if (!control) return NextResponse.json({ error: "Control no encontrado" }, { status: 404 });
    if (!soa || !soa.aplica || soa.estado === "generado") {
      return NextResponse.json({ error: "El control debe aplicar y estar revisado para generar su evidencia." }, { status: 400 });
    }
    if (soa.evidencia_documento_id) {
      return NextResponse.json({ error: "El control ya tiene un documento de evidencia." }, { status: 409 });
    }

    const result = await aiClient.controlDocument({
      organizacion: {
        nombre_organizacion: org.nombre_organizacion, sector: org.sector, numero_colaboradores: org.numero_colaboradores,
        mision: org.mision, vision: org.vision, estado_sgsi: org.estado_sgsi,
      },
      alcance_sgsi: org.alcance_sgsi,
      control: { codigo: control.codigo, nombre: control.nombre, descripcion: control.descripcion },
    });

    await recordUsage({
      organizacion_id: orgId, usuario_id: userId, operacion: "documento_control",
      modelo: "ai-service", tokens_input: result.usage.input, tokens_output: result.usage.output,
    });

    // Crear el Documento (tipo 'Control') y enlazarlo como evidencia, en una transacción.
    const existing = await prisma.documento.findMany({ where: { organizacion_id: orgId }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("CTL", existing.map((d) => d.codigo));
    const nombre = `Control ${control.codigo} — ${control.nombre}`.slice(0, 200);

    const documento = await prisma.$transaction(async (tx) => {
      const doc = await tx.documento.create({
        data: {
          organizacion_id: orgId, codigo, nombre, tipo: "Control", obligatorio: false,
          descripcion: control.descripcion.slice(0, 500) || `Documento de implementación del control ${control.codigo}.`,
          contenido: sanitizeDocumentHtml(result.contenido_html), version: "1.0", estado: "borrador",
        },
      });
      await tx.controlSoa.update({ where: { id: soa.id }, data: { evidencia_documento_id: doc.id } });
      return doc;
    });

    // Vectorización (no bloqueante).
    await vectorizeRecordSafe({
      organizacion_id: orgId, tabla_origen: "documento", registro_origen_id: documento.id,
      campo_origen: "contenido", chunk_texto: chunkForDocumento(documento),
      metadata: { tipo: "Control", control: control.codigo },
    });

    return NextResponse.json({
      documento: { id: documento.id, codigo: documento.codigo, nombre: documento.nombre },
      iso_disponible: result.iso_disponible,
    }, { status: 201 });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message, waitSeconds: e.waitSeconds }, { status: 429 });
    }
    if (e instanceof AiServiceError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return apiError(e, "No se pudo generar el documento de evidencia");
  }
}
