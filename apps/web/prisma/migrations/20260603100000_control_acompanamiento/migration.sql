-- Acompañamiento de implementación de controles del Anexo A.
-- 1) Responsable del control (cláusula 5.3): rol SGSI + usuario titular.
ALTER TABLE "control_soa" ADD COLUMN "rol_sgsi_id" INTEGER;
ALTER TABLE "control_soa" ADD COLUMN "responsable_usuario_id" INTEGER;

ALTER TABLE "control_soa"
    ADD CONSTRAINT "control_soa_rol_sgsi_id_fkey"
    FOREIGN KEY ("rol_sgsi_id") REFERENCES "rol_sgsi" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "control_soa"
    ADD CONSTRAINT "control_soa_responsable_usuario_id_fkey"
    FOREIGN KEY ("responsable_usuario_id") REFERENCES "usuario" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) Plan de actividades de implementación del control.
CREATE TABLE "control_actividad" (
    "id"                     SERIAL       NOT NULL,
    "control_soa_id"         INTEGER      NOT NULL,
    "descripcion"            TEXT         NOT NULL,
    "responsable_usuario_id" INTEGER,
    "fecha_objetivo"         DATE,
    "estado"                 VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
    "orden"                  INTEGER      NOT NULL DEFAULT 0,
    "created_at"             TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"             TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "control_actividad_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "control_actividad_control_soa_id_idx" ON "control_actividad" ("control_soa_id");

ALTER TABLE "control_actividad"
    ADD CONSTRAINT "control_actividad_control_soa_id_fkey"
    FOREIGN KEY ("control_soa_id") REFERENCES "control_soa" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "control_actividad"
    ADD CONSTRAINT "control_actividad_responsable_usuario_id_fkey"
    FOREIGN KEY ("responsable_usuario_id") REFERENCES "usuario" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
