-- M3 Riesgos — criterios de aceptación del riesgo (cláusula 6.1.2):
-- apetito (declaración cualitativa) y tolerancia (umbral de nivel aceptable).
ALTER TABLE "organizacion" ADD COLUMN "apetito_riesgo" TEXT;
ALTER TABLE "organizacion" ADD COLUMN "tolerancia_riesgo" INTEGER;
