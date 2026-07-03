-- M3 SoA — soporte para controles sugeridos por IA (aprobación ligera).
-- estado='generado' marca el control sugerido pendiente de revisión del CISO.
ALTER TABLE "control_soa" ADD COLUMN "origen" VARCHAR(20) NOT NULL DEFAULT 'manual';
ALTER TABLE "control_soa" ADD COLUMN "justificacion_ia" TEXT;
