-- HU21: cuerpo editable in-app del documento.
ALTER TABLE "documento" ADD COLUMN "contenido" TEXT;

-- HU24: trazabilidad de cambios documentales.
CREATE TABLE "documento_historial" (
    "id"             BIGSERIAL    NOT NULL,
    "documento_id"   INTEGER      NOT NULL,
    "version"        VARCHAR(20)  NOT NULL,
    "nombre"         VARCHAR(200) NOT NULL,
    "estado"         VARCHAR(40)  NOT NULL,
    "contenido"      TEXT,
    "cambio_resumen" TEXT,
    "usuario_id"     INTEGER,
    "created_at"     TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "documento_historial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documento_historial_documento_id_created_at_idx"
    ON "documento_historial" ("documento_id", "created_at");

ALTER TABLE "documento_historial"
    ADD CONSTRAINT "documento_historial_documento_id_fkey"
    FOREIGN KEY ("documento_id") REFERENCES "documento" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documento_historial"
    ADD CONSTRAINT "documento_historial_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
