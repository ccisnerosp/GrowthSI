-- M3 Riesgos — trazabilidad de la reevaluación del riesgo (P·I actual).
-- Cada cambio del par probabilidad/impacto actual exige justificación obligatoria
-- y queda registrado con su autor (mismo patrón que documento_historial).
CREATE TABLE "riesgo_historial" (
    "id"                    BIGSERIAL    NOT NULL,
    "riesgo_id"             INTEGER      NOT NULL,
    "probabilidad_anterior" INTEGER      NOT NULL,
    "impacto_anterior"      INTEGER      NOT NULL,
    "nivel_anterior"        INTEGER      NOT NULL,
    "probabilidad_nueva"    INTEGER      NOT NULL,
    "impacto_nueva"         INTEGER      NOT NULL,
    "nivel_nuevo"           INTEGER      NOT NULL,
    "justificacion"         TEXT         NOT NULL,
    "usuario_id"            INTEGER,
    "created_at"            TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "riesgo_historial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "riesgo_historial_riesgo_id_created_at_idx"
    ON "riesgo_historial" ("riesgo_id", "created_at");

ALTER TABLE "riesgo_historial"
    ADD CONSTRAINT "riesgo_historial_riesgo_id_fkey"
    FOREIGN KEY ("riesgo_id") REFERENCES "riesgo" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "riesgo_historial"
    ADD CONSTRAINT "riesgo_historial_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
