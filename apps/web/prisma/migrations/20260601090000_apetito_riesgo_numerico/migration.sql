-- M3 Riesgos — apetito de riesgo pasa a ser NUMÉRICO (nivel), igual que la
-- tolerancia. El campo se agregó esta sesión sin datos productivos: drop + re-add.
ALTER TABLE "organizacion" DROP COLUMN "apetito_riesgo";
ALTER TABLE "organizacion" ADD COLUMN "apetito_riesgo" INTEGER;
