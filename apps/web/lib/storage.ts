// Almacenamiento de imágenes de los documentos.
//   · Desarrollo: disco local bajo public/uploads → servido como /uploads/<archivo>.
//   · Despliegue: Azure Blob si AZURE_STORAGE_CONNECTION_STRING + AZURE_STORAGE_CONTAINER
//     están definidos (import dinámico → @azure/storage-blob solo se carga en prod).
//
// Devuelve la URL pública (relativa en dev, absoluta de Blob en prod) que se guarda
// dentro del HTML del documento. NUNCA base64: mantiene la BD ligera y escalable.

import { randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export class StorageError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export function isAllowedImageMime(mime: string): boolean {
  return mime in EXT_BY_MIME;
}

/** Persiste una imagen y devuelve su URL pública. */
export async function saveImage(buffer: Buffer, mime: string): Promise<string> {
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new StorageError("Tipo de imagen no permitido (usa PNG, JPG, WEBP o GIF).");
  if (buffer.length > MAX_IMAGE_BYTES) throw new StorageError("La imagen supera el máximo de 5 MB.");

  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  // ── Producción: Azure Blob ───────────────────────────────────────────
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const container = process.env.AZURE_STORAGE_CONTAINER;
  if (conn && container) {
    // Dep OPCIONAL, solo en producción. La variable evita que TS exija el paquete;
    // los comentarios mágicos evitan que el bundler (Turbopack/webpack) intente
    // resolverlo en build cuando NO está instalado (dev).
    const pkg = "@azure/storage-blob";
    const { BlobServiceClient } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pkg);
    const svc = BlobServiceClient.fromConnectionString(conn);
    const client = svc.getContainerClient(container).getBlockBlobClient(`documentos/${name}`);
    await client.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mime } });
    return client.url;
  }

  // ── Desarrollo: disco local bajo public/uploads ──────────────────────
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}

// ── Adjuntos .docx (PRIVADOS: nunca servidos por URL pública) ────────────────
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const MAX_DOCX_BYTES = 10 * 1024 * 1024; // 10 MB
const PRIVATE_DIR = path.join(process.cwd(), ".private-uploads");
const KEY_RE = /^documentos\/[A-Za-z0-9._-]+\.docx$/;

/** Un .docx es un ZIP: debe empezar con la firma PK\x03\x04. */
export function isDocxSignature(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

/** Guarda el .docx en almacenamiento privado y devuelve su CLAVE (no una URL). */
export async function saveDocx(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_DOCX_BYTES) throw new StorageError("El archivo supera el máximo de 10 MB.");
  if (!isDocxSignature(buffer)) throw new StorageError("El archivo no es un .docx válido.");
  const key = `documentos/${Date.now()}-${randomBytes(8).toString("hex")}.docx`;

  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const container = process.env.AZURE_STORAGE_CONTAINER;
  if (conn && container) {
    const pkg = "@azure/storage-blob";
    const { BlobServiceClient } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pkg);
    const svc = BlobServiceClient.fromConnectionString(conn);
    await svc.getContainerClient(container).getBlockBlobClient(key).uploadData(buffer, { blobHTTPHeaders: { blobContentType: DOCX_MIME } });
    return key;
  }
  await mkdir(path.join(PRIVATE_DIR, "documentos"), { recursive: true });
  await writeFile(path.join(PRIVATE_DIR, key), buffer);
  return key;
}

/** Lee el .docx privado por su clave (validada contra path traversal). */
export async function readDocx(key: string): Promise<Buffer> {
  if (!KEY_RE.test(key)) throw new StorageError("Clave de archivo inválida.");
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const container = process.env.AZURE_STORAGE_CONTAINER;
  if (conn && container) {
    const pkg = "@azure/storage-blob";
    const { BlobServiceClient } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pkg);
    const svc = BlobServiceClient.fromConnectionString(conn);
    return svc.getContainerClient(container).getBlockBlobClient(key).downloadToBuffer();
  }
  return readFile(path.join(PRIVATE_DIR, key));
}
