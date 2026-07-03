-- M2 — nombre original del .docx adjunto (para descarga). archivo_url pasa a guardar
-- la clave de almacenamiento privado del archivo, no una URL pública.
ALTER TABLE "documento" ADD COLUMN "archivo_nombre" VARCHAR(255);
