-- Riesgos: soporte para el sugeridor IA de escenarios (4 dominios ISO 27001:2022)
-- · escenario_riesgo: dominio + origen + justificacion_ia
-- · riesgo: origen
-- El estado 'generado' (IA, pendiente de revisión) se maneja en el campo
-- estado existente (VarChar) — no requiere cambio de tipo.

ALTER TABLE "escenario_riesgo" ADD COLUMN "dominio" VARCHAR(40);
ALTER TABLE "escenario_riesgo" ADD COLUMN "origen" VARCHAR(20) NOT NULL DEFAULT 'manual';
ALTER TABLE "escenario_riesgo" ADD COLUMN "justificacion_ia" TEXT;

ALTER TABLE "riesgo" ADD COLUMN "origen" VARCHAR(20) NOT NULL DEFAULT 'manual';
