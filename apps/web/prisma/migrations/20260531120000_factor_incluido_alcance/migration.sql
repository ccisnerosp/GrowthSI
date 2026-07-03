-- M1 Alcance — los factores I/E ahora se marcan dentro/fuera del alcance (4.3),
-- igual que sedes y procesos. Solo los incluidos se envían al sugeridor.
-- Por defecto true: no cambia el comportamiento de los factores existentes.
ALTER TABLE "factor" ADD COLUMN "incluido_alcance" BOOLEAN NOT NULL DEFAULT true;
