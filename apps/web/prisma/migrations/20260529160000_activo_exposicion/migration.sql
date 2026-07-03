-- M3 Riesgos — exposición de red del activo (Nivel 2 del contexto del sugeridor).
-- Gobierna la relevancia del Patrón B (NVD) y pondera la probabilidad del riesgo
-- técnico. Nullable: los activos existentes quedan como exposición desconocida.
ALTER TABLE "activo_informacion" ADD COLUMN "exposicion" VARCHAR(20);
