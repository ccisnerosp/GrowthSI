// Subida de imágenes para el editor de documentos. Solo usuarios que pueden editar
// documentos. Valida MIME + tamaño y delega en lib/storage (local/Blob).

import { type NextRequest, NextResponse } from "next/server";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { saveImage, isAllowedImageMime, MAX_IMAGE_BYTES, StorageError } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const { error } = await apiRequirePermission("documento", "update");
  if (error) return error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido (se esperaba multipart/form-data)" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo 'file'" }, { status: 400 });
  }
  if (!isAllowedImageMime(file.type)) {
    return NextResponse.json({ error: "Tipo de imagen no permitido (usa PNG, JPG, WEBP o GIF)." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "La imagen supera el máximo de 5 MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await saveImage(buffer, file.type);
    return NextResponse.json({ url }, { status: 201 });
  } catch (e) {
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("upload failed", e);
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }
}
