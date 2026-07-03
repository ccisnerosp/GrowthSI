-- M1 — Roles, responsabilidades y autoridades del SGSI (cláusula 5.3).
CREATE TABLE "rol_sgsi" (
    "id"                SERIAL       NOT NULL,
    "organizacion_id"   INTEGER      NOT NULL,
    "codigo"            VARCHAR(30)  NOT NULL,
    "nombre"            VARCHAR(150) NOT NULL,
    "tipo"              VARCHAR(30)  NOT NULL,
    "descripcion"       TEXT         NOT NULL,
    "responsabilidades" TEXT         NOT NULL,
    "autoridades"       TEXT         NOT NULL,
    "usuario_id"        INTEGER,
    "estado"            VARCHAR(40)  NOT NULL DEFAULT 'activo',
    "created_at"        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rol_sgsi_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rol_sgsi_organizacion_id_codigo_key" ON "rol_sgsi" ("organizacion_id", "codigo");

ALTER TABLE "rol_sgsi"
    ADD CONSTRAINT "rol_sgsi_organizacion_id_fkey"
    FOREIGN KEY ("organizacion_id") REFERENCES "organizacion" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rol_sgsi"
    ADD CONSTRAINT "rol_sgsi_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
