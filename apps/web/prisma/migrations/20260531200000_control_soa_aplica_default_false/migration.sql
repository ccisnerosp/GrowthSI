-- M3 SoA — 'Aplica' inicia en No: un control solo aplica cuando el contexto lo
-- justifica (sugerencia IA o decisión manual). No altera filas existentes.
ALTER TABLE "control_soa" ALTER COLUMN "aplica" SET DEFAULT false;
