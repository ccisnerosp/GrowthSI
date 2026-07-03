// M2 — Adjuntar un Word (.docx): se convierte a HTML (mammoth, server-side),
// se SANEA y REEMPLAZA el cuerpo (`contenido`) del documento; el .docx original
// se guarda en almacenamiento privado y se descarga vía esta misma ruta (GET).
//
// Seguridad: AuthN+RBAC+tenant, validación de MIME + firma ZIP + tamaño, sanitización
// del HTML, almacenamiento privado (nunca URL pública), descarga como adjunto (nosniff).

import { type NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-helpers";
import { sanitizeDocumentHtml } from "@/lib/sanitize-html";
import { saveDocx, readDocx, isDocxSignature, DOCX_MIME, MAX_DOCX_BYTES, StorageError } from "@/lib/storage";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForDocumento } from "@/lib/ai/chunk-text";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("documento", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const orgId = session.user.organizacion_id;

  try {
    const prev = await prisma.documento.findUnique({ where: { id } });
    if (!prev || prev.organizacion_id !== orgId || prev.deleted_at) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    let form: FormData;
    try { form = await req.formData(); } catch { return NextResponse.json({ error: "Cuerpo inválido (multipart/form-data)" }, { status: 400 }); }
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo 'file'" }, { status: 400 });

    // Validación de tipo: extensión + MIME + (más abajo) firma del archivo. Rechaza .docm.
    if (!file.name.toLowerCase().endsWith(".docx") || file.type !== DOCX_MIME) {
      return NextResponse.json({ error: "Solo se admiten archivos Word .docx" }, { status: 400 });
    }
    if (file.size > MAX_DOCX_BYTES) return NextResponse.json({ error: "El archivo supera el máximo de 10 MB" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isDocxSignature(buffer)) return NextResponse.json({ error: "El archivo no es un .docx válido" }, { status: 400 });

    // Conversión Word → HTML (mammoth ignora macros; solo lee el documento).
    let html: string;
    try {
      const result = await mammoth.convertToHtml({ buffer });
      html = sanitizeDocumentHtml(result.value);
    } catch {
      return NextResponse.json({ error: "No se pudo procesar el Word. ¿Está dañado o protegido?" }, { status: 422 });
    }
    if (html.replace(/<[^>]*>/g, "").trim().length === 0) {
      return NextResponse.json({ error: "El Word no contiene texto convertible." }, { status: 422 });
    }

    const key = await saveDocx(buffer);
    const nombreArchivo = file.name.slice(0, 255);

    // Snapshot del contenido anterior (HU24) + reemplazo, en transacción.
    const documento = await prisma.$transaction(async (tx) => {
      await tx.documentoHistorial.create({
        data: {
          documento_id: prev.id, version: prev.version, nombre: prev.nombre, estado: prev.estado,
          contenido: prev.contenido, cambio_resumen: `Contenido reemplazado al importar Word: ${nombreArchivo}`,
          usuario_id: session.user.userId,
        },
      });
      return tx.documento.update({ where: { id }, data: { contenido: html, archivo_url: key, archivo_nombre: nombreArchivo } });
    });

    await vectorizeRecordSafe({
      organizacion_id: orgId, tabla_origen: "documento", registro_origen_id: documento.id,
      campo_origen: "contenido", chunk_texto: chunkForDocumento(documento),
      metadata: { tipo: documento.tipo, importado_docx: true },
    });

    return NextResponse.json({ contenido: html, archivo_nombre: nombreArchivo });
  } catch (e) {
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: e.status });
    return apiError(e, "No se pudo importar el Word");
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("documento", "read");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const doc = await prisma.documento.findUnique({ where: { id }, select: { organizacion_id: true, deleted_at: true, archivo_url: true, archivo_nombre: true } });
  if (!doc || doc.organizacion_id !== session.user.organizacion_id || doc.deleted_at || !doc.archivo_url) {
    return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 });
  }

  try {
    const buffer = await readDocx(doc.archivo_url);
    const safeName = (doc.archivo_nombre ?? "documento.docx").replace(/[^\w.\- ]/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: e.status });
    return apiError(e, "No se pudo descargar el adjunto");
  }
}
