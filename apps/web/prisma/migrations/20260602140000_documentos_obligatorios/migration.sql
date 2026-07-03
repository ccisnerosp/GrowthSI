-- M2 — Catálogo de información documentada obligatoria (ISO/IEC 27001:2022) + vínculo.
CREATE TABLE "documento_obligatorio" (
    "id"          SERIAL       NOT NULL,
    "codigo"      VARCHAR(20)  NOT NULL,
    "clausula"    VARCHAR(20)  NOT NULL,
    "nombre"      VARCHAR(200) NOT NULL,
    "tipo"        VARCHAR(20)  NOT NULL,
    "modulo"      VARCHAR(20)  NOT NULL,
    "descripcion" TEXT         NOT NULL,
    "orden"       INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT "documento_obligatorio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "documento_obligatorio_codigo_key" ON "documento_obligatorio" ("codigo");

ALTER TABLE "documento" ADD COLUMN "obligatorio_id" INTEGER;
ALTER TABLE "documento"
    ADD CONSTRAINT "documento_obligatorio_id_fkey"
    FOREIGN KEY ("obligatorio_id") REFERENCES "documento_obligatorio" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
