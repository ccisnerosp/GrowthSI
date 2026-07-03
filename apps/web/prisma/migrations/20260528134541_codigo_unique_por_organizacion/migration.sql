-- Código único POR ORGANIZACIÓN (no global).
-- Soluciona la colisión cross-tenant: dos tenants pueden tener ambos SED-001.
-- Solo agrega constraints compuestos; no hay pérdida de datos.

-- DropIndex (unique global de codigo)
DROP INDEX "sede_codigo_key";
DROP INDEX "factor_codigo_key";
DROP INDEX "partes_interesadas_codigo_key";
DROP INDEX "proceso_codigo_key";
DROP INDEX "activo_informacion_codigo_key";
DROP INDEX "documento_codigo_key";
DROP INDEX "objetivo_sgsi_codigo_key";
DROP INDEX "aprobacion_codigo_key";

-- CreateIndex (unique compuesto organizacion_id + codigo)
CREATE UNIQUE INDEX "sede_organizacion_id_codigo_key" ON "sede"("organizacion_id", "codigo");
CREATE UNIQUE INDEX "factor_organizacion_id_codigo_key" ON "factor"("organizacion_id", "codigo");
CREATE UNIQUE INDEX "partes_interesadas_organizacion_id_codigo_key" ON "partes_interesadas"("organizacion_id", "codigo");
CREATE UNIQUE INDEX "proceso_organizacion_id_codigo_key" ON "proceso"("organizacion_id", "codigo");
CREATE UNIQUE INDEX "activo_informacion_organizacion_id_codigo_key" ON "activo_informacion"("organizacion_id", "codigo");
CREATE UNIQUE INDEX "documento_organizacion_id_codigo_key" ON "documento"("organizacion_id", "codigo");
CREATE UNIQUE INDEX "objetivo_sgsi_organizacion_id_codigo_key" ON "objetivo_sgsi"("organizacion_id", "codigo");
CREATE UNIQUE INDEX "aprobacion_organizacion_id_codigo_key" ON "aprobacion"("organizacion_id", "codigo");
