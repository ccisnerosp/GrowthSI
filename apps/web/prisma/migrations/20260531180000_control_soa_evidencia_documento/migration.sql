-- M3 SoA — la evidencia de un control puede ser un documento del módulo Documentos.
ALTER TABLE "control_soa" ADD COLUMN "evidencia_documento_id" INTEGER;

ALTER TABLE "control_soa"
    ADD CONSTRAINT "control_soa_evidencia_documento_id_fkey"
    FOREIGN KEY ("evidencia_documento_id") REFERENCES "documento" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
