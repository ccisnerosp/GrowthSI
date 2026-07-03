-- Aviso de revisión aguas abajo tras editar el alcance del SGSI (4.3 → 6.1/7.5/8.3).
-- 1) Sello de tiempo del último cambio del alcance.
ALTER TABLE "organizacion" ADD COLUMN "alcance_modificado_at" TIMESTAMP(6);

-- 2) Confirmaciones de revisión por módulo (rastro auditable de quién y cuándo).
CREATE TABLE "revision_alcance" (
    "id"              SERIAL       NOT NULL,
    "organizacion_id" INTEGER      NOT NULL,
    "modulo"          VARCHAR(20)  NOT NULL,
    "revisado_at"     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisado_por"    INTEGER,
    "created_at"      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revision_alcance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "revision_alcance_organizacion_id_modulo_idx" ON "revision_alcance" ("organizacion_id", "modulo");

ALTER TABLE "revision_alcance"
    ADD CONSTRAINT "revision_alcance_organizacion_id_fkey"
    FOREIGN KEY ("organizacion_id") REFERENCES "organizacion" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "revision_alcance"
    ADD CONSTRAINT "revision_alcance_revisado_por_fkey"
    FOREIGN KEY ("revisado_por") REFERENCES "usuario" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
