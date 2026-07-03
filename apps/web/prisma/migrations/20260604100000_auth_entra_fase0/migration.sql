-- Fase 0 — Preparación para autenticación Entra ID multi-tenant (cambios ADITIVOS).
-- No altera el comportamiento del login actual; solo prepara el modelo de datos.

-- Tenant: mapeo del directorio Entra (`tid`) + método de auth + consentimiento.
ALTER TABLE "tenant" ADD COLUMN "entra_tenant_id"    VARCHAR(64);
ALTER TABLE "tenant" ADD COLUMN "auth_method"        VARCHAR(20) NOT NULL DEFAULT 'credentials';
ALTER TABLE "tenant" ADD COLUMN "consent_status"     VARCHAR(20);
ALTER TABLE "tenant" ADD COLUMN "consent_granted_at" TIMESTAMP(6);
ALTER TABLE "tenant" ADD COLUMN "default_rol_jit"    VARCHAR(40) DEFAULT 'Auditor';

-- Único pero nullable: en Postgres se permiten múltiples NULL (orgs sin Entra).
CREATE UNIQUE INDEX "tenant_entra_tenant_id_key" ON "tenant" ("entra_tenant_id");

-- Usuario: password opcional (usuarios solo-Entra) + proveedor de auth.
ALTER TABLE "usuario" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "usuario" ADD COLUMN "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'credentials';
