-- CreateTable
CREATE TABLE "vector_global" (
    "id" BIGSERIAL NOT NULL,
    "fuente" VARCHAR(120) NOT NULL,
    "documento" VARCHAR(200) NOT NULL,
    "seccion" VARCHAR(120),
    "chunk_indice" INTEGER NOT NULL,
    "chunk_texto" TEXT NOT NULL,
    "chunk_hash" VARCHAR(128) NOT NULL,
    "tokens" INTEGER NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "modelo_embedding" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_global_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_job" (
    "id" BIGSERIAL NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "organizacion_id" INTEGER,
    "fuente" VARCHAR(120) NOT NULL,
    "blob_url" VARCHAR(500),
    "ruta_local" VARCHAR(500),
    "estado" VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    "resultado" JSONB,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_at" TIMESTAMP(6),
    "completado_at" TIMESTAMP(6),

    CONSTRAINT "ingestion_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vector_global_fuente_idx" ON "vector_global"("fuente");

-- CreateIndex
CREATE UNIQUE INDEX "vector_global_fuente_chunk_hash_key" ON "vector_global"("fuente", "chunk_hash");

-- CreateIndex
CREATE INDEX "ingestion_job_estado_created_at_idx" ON "ingestion_job"("estado", "created_at");
