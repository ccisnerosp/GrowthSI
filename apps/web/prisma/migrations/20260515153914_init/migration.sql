-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "tenant" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "plan" VARCHAR(50) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizacion" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre_organizacion" VARCHAR(180) NOT NULL,
    "ruc" VARCHAR(11) NOT NULL,
    "sector" VARCHAR(100) NOT NULL,
    "numero_colaboradores" INTEGER NOT NULL,
    "dominio" VARCHAR(120) NOT NULL,
    "mision" TEXT NOT NULL,
    "vision" TEXT NOT NULL,
    "estado_sgsi" VARCHAR(50) NOT NULL,
    "inicio_proyecto" DATE NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "alcance_sgsi" TEXT,
    "criterio_riesgo_p" INTEGER,
    "criterio_riesgo_i" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "correo" VARCHAR(180) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "funcion" VARCHAR(120) NOT NULL,
    "rol" VARCHAR(80) NOT NULL,
    "area" VARCHAR(100) NOT NULL,
    "mfa_activo" BOOLEAN NOT NULL DEFAULT false,
    "azure_oid" VARCHAR(128),
    "ultimo_acceso_at" TIMESTAMP(6),
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sede" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre_sede" VARCHAR(150) NOT NULL,
    "pais_sede" VARCHAR(80) NOT NULL,
    "departamento_sede" VARCHAR(80) NOT NULL,
    "provincia_sede" VARCHAR(80) NOT NULL,
    "distrito_sede" VARCHAR(80) NOT NULL,
    "incluido_alcance" BOOLEAN NOT NULL DEFAULT true,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factor" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "origen" VARCHAR(20) NOT NULL,
    "categoria" VARCHAR(80) NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "impacto" VARCHAR(30) NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "fecha_identificacion" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partes_interesadas" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "expectativas" TEXT NOT NULL,
    "requisitos" TEXT NOT NULL,
    "relevancia" VARCHAR(30) NOT NULL,
    "contacto" VARCHAR(150) NOT NULL,
    "frecuencia_interaccion" VARCHAR(80) NOT NULL,
    "responsable_interno" VARCHAR(150) NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partes_interesadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proceso" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(180) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "area" VARCHAR(100) NOT NULL,
    "criticidad" VARCHAR(30) NOT NULL,
    "kpis" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "incluido_alcance" BOOLEAN NOT NULL DEFAULT true,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "proceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activo_informacion" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(180) NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "formato" VARCHAR(40) NOT NULL,
    "ubicacion" VARCHAR(200) NOT NULL,
    "clasificacion" VARCHAR(60) NOT NULL,
    "confidencialidad" VARCHAR(30) NOT NULL,
    "integridad" VARCHAR(30) NOT NULL,
    "disponibilidad" VARCHAR(30) NOT NULL,
    "valoracion" VARCHAR(30) NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "modelo" VARCHAR(180) NOT NULL,
    "version" VARCHAR(180) NOT NULL,
    "proveedor" VARCHAR(180) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "activo_informacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proceso_activo" (
    "activo_informacion_id" INTEGER NOT NULL,
    "proceso_id" INTEGER NOT NULL,
    "tipo_relacion" VARCHAR(50) NOT NULL,
    "criticidad_relacion" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proceso_activo_pkey" PRIMARY KEY ("activo_informacion_id","proceso_id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "obligatorio" BOOLEAN NOT NULL,
    "descripcion" TEXT NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "archivo_url" TEXT,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'borrador',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objetivo_sgsi" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(180) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "indicador" VARCHAR(180) NOT NULL,
    "meta" VARCHAR(120) NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objetivo_sgsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprobacion" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "tipo_entidad" VARCHAR(40) NOT NULL,
    "entidad_id" BIGINT NOT NULL,
    "comentario" TEXT NOT NULL,
    "fecha_solicitud" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP(6),
    "fecha_vencimiento" DATE NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aprobacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escenario_riesgo" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "amenaza" VARCHAR(180) NOT NULL,
    "vulnerabilidad" VARCHAR(180) NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'identificado',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "escenario_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riesgo" (
    "id" SERIAL NOT NULL,
    "escenario_riesgo_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "probabilidad_inicial" INTEGER NOT NULL,
    "impacto_inicial" INTEGER NOT NULL,
    "nivel_inicial" INTEGER NOT NULL,
    "tratamiento" VARCHAR(80) NOT NULL,
    "probabilidad_actual" INTEGER NOT NULL,
    "impacto_actual" INTEGER NOT NULL,
    "nivel_actual" INTEGER NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'identificado',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividad_riesgo" (
    "id" SERIAL NOT NULL,
    "riesgo_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo_actividad" VARCHAR(50) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "fecha_cierre" DATE,
    "probabilidad_resultante" INTEGER NOT NULL,
    "impacto_resultante" INTEGER NOT NULL,
    "nivel_resultante" INTEGER NOT NULL,
    "resultado" TEXT NOT NULL,
    "evidencia_url" TEXT NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividad_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controles_anexo_a" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(250) NOT NULL,
    "dominio" VARCHAR(50) NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "controles_anexo_a_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_soa" (
    "id" SERIAL NOT NULL,
    "control_anexo_a_id" INTEGER NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "aplica" BOOLEAN NOT NULL DEFAULT true,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'no_iniciado',
    "justificacion" TEXT NOT NULL,
    "evidencia" TEXT NOT NULL,
    "observaciones" TEXT NOT NULL,
    "fecha_revision" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_soa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riesgo_control" (
    "control_soa_id" INTEGER NOT NULL,
    "riesgo_id" INTEGER NOT NULL,
    "tipo_relacion" VARCHAR(50) NOT NULL,
    "efectividad_estimada" VARCHAR(30) NOT NULL,
    "observaciones" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riesgo_control_pkey" PRIMARY KEY ("control_soa_id","riesgo_id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "alcance" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'planificada',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_hallazgo" (
    "id" SERIAL NOT NULL,
    "auditoria_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "titulo" VARCHAR(220) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "severidad" VARCHAR(40) NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'abierto',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_hallazgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_conformidades" (
    "id" SERIAL NOT NULL,
    "auditoria_id" INTEGER NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "titulo" VARCHAR(220) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "causa_raiz" TEXT NOT NULL,
    "accion_correctiva" TEXT NOT NULL,
    "severidad" VARCHAR(40) NOT NULL,
    "fecha_identificacion" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "fecha_cierre" DATE,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'identificada',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "no_conformidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_chunk" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "tabla_origen" VARCHAR(80) NOT NULL,
    "registro_origen_id" BIGINT NOT NULL,
    "campo_origen" VARCHAR(80) NOT NULL,
    "chunk_indice" INTEGER NOT NULL,
    "chunk_texto" TEXT NOT NULL,
    "chunk_hash" VARCHAR(128) NOT NULL,
    "tokens" INTEGER NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "modelo_embedding" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "vector_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ia_uso" (
    "id" BIGSERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "usuario_id" INTEGER,
    "operacion" VARCHAR(60) NOT NULL,
    "modelo" VARCHAR(80) NOT NULL,
    "tokens_input" INTEGER NOT NULL DEFAULT 0,
    "tokens_output" INTEGER NOT NULL DEFAULT 0,
    "costo_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_uso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_codigo_key" ON "organizacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_ruc_key" ON "organizacion"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_azure_oid_key" ON "usuario"("azure_oid");

-- CreateIndex
CREATE UNIQUE INDEX "sede_codigo_key" ON "sede"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "factor_codigo_key" ON "factor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "partes_interesadas_codigo_key" ON "partes_interesadas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "proceso_codigo_key" ON "proceso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "activo_informacion_codigo_key" ON "activo_informacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "documento_codigo_key" ON "documento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "objetivo_sgsi_codigo_key" ON "objetivo_sgsi"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "aprobacion_codigo_key" ON "aprobacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "escenario_riesgo_codigo_key" ON "escenario_riesgo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "riesgo_codigo_key" ON "riesgo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "actividad_riesgo_codigo_key" ON "actividad_riesgo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "controles_anexo_a_codigo_key" ON "controles_anexo_a"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "control_soa_control_anexo_a_id_organizacion_id_key" ON "control_soa"("control_anexo_a_id", "organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "auditoria_codigo_key" ON "auditoria"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "auditoria_hallazgo_codigo_key" ON "auditoria_hallazgo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "no_conformidades_codigo_key" ON "no_conformidades"("codigo");

-- CreateIndex
CREATE INDEX "vector_chunk_organizacion_id_tabla_origen_idx" ON "vector_chunk"("organizacion_id", "tabla_origen");

-- CreateIndex
CREATE INDEX "ia_uso_organizacion_id_created_at_idx" ON "ia_uso"("organizacion_id", "created_at");

-- AddForeignKey
ALTER TABLE "organizacion" ADD CONSTRAINT "organizacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sede" ADD CONSTRAINT "sede_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factor" ADD CONSTRAINT "factor_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_interesadas" ADD CONSTRAINT "partes_interesadas_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proceso" ADD CONSTRAINT "proceso_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activo_informacion" ADD CONSTRAINT "activo_informacion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proceso_activo" ADD CONSTRAINT "proceso_activo_activo_informacion_id_fkey" FOREIGN KEY ("activo_informacion_id") REFERENCES "activo_informacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proceso_activo" ADD CONSTRAINT "proceso_activo_proceso_id_fkey" FOREIGN KEY ("proceso_id") REFERENCES "proceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivo_sgsi" ADD CONSTRAINT "objetivo_sgsi_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprobacion" ADD CONSTRAINT "aprobacion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escenario_riesgo" ADD CONSTRAINT "escenario_riesgo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riesgo" ADD CONSTRAINT "riesgo_escenario_riesgo_id_fkey" FOREIGN KEY ("escenario_riesgo_id") REFERENCES "escenario_riesgo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_riesgo" ADD CONSTRAINT "actividad_riesgo_riesgo_id_fkey" FOREIGN KEY ("riesgo_id") REFERENCES "riesgo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_soa" ADD CONSTRAINT "control_soa_control_anexo_a_id_fkey" FOREIGN KEY ("control_anexo_a_id") REFERENCES "controles_anexo_a"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_soa" ADD CONSTRAINT "control_soa_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riesgo_control" ADD CONSTRAINT "riesgo_control_control_soa_id_fkey" FOREIGN KEY ("control_soa_id") REFERENCES "control_soa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riesgo_control" ADD CONSTRAINT "riesgo_control_riesgo_id_fkey" FOREIGN KEY ("riesgo_id") REFERENCES "riesgo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_hallazgo" ADD CONSTRAINT "auditoria_hallazgo_auditoria_id_fkey" FOREIGN KEY ("auditoria_id") REFERENCES "auditoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_conformidades" ADD CONSTRAINT "no_conformidades_auditoria_id_fkey" FOREIGN KEY ("auditoria_id") REFERENCES "auditoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_chunk" ADD CONSTRAINT "vector_chunk_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ia_uso" ADD CONSTRAINT "ia_uso_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
