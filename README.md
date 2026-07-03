# GrowthSI

Aplicación web para la **gestión de la seguridad de la información (SGSI)** conforme a la
**ISO/IEC 27001:2022**, potenciada con **inteligencia artificial generativa (RAG + NVD)** y
orientada a **PYMEs comerciales**. Automatiza la implementación del SGSI de extremo a extremo:
contexto, alcance, riesgos, controles y documentos.

## Características

- SGSI basado en **ISO/IEC 27001:2022** con ciclo PDCA.
- **IA generativa con RAG** sobre normas y marcos (ISO, MITRE ATT&CK, ENISA) y **consulta en vivo de vulnerabilidades** (NVD/CVE).
- Arquitectura **multi-tenant** (una instancia, múltiples organizaciones).

## Módulos

- **Contexto I/E**: sedes, factores (FODA), partes interesadas, procesos y activos.
- **Alcance del SGSI**: redacción del alcance (IA), roles del SGSI y objetivos.
- **Riesgos**: sugeridor de escenarios con IA (RAG + CVE del NVD).
- **Controles (SoA)**: selección de controles del Anexo A con IA.
- **Documentos**: redactor de plantillas del SGSI con IA.
- **Auditorías y no conformidades** (9.2 / 10.1) y **revisión por la dirección** (9.3).

## Arquitectura

Monorepo con dos servicios: `apps/web` (Next.js — frontend + API) y `apps/ai-service`
(FastAPI — funciones de IA), sobre **PostgreSQL + pgvector**. En producción utiliza
**Azure OpenAI**; la inteligencia de vulnerabilidades proviene del **NVD (NIST)**.

## Puesta en marcha (Docker Compose)

Requisitos: **Docker Desktop** y **Git**.

```bash
git clone https://github.com/ccisnerosp/GrowthSI.git
cd GrowthSI

# 1) Variables de entorno en la raíz (para docker compose)
cat > .env <<'EOF'
OPENAI_API_KEY=tu-clave-de-openai
AUTH_SECRET=una-cadena-larga-y-secreta
AI_SERVICE_API_KEY=un-secreto-compartido
EOF

# 2) Construir y levantar (postgres + redis + ai-service + web)
docker compose up -d --build

# 3) Migraciones y catálogos núcleo
docker compose exec web npx prisma migrate deploy
docker compose exec web node prisma/seed-anexo-a.mjs
docker compose exec web node prisma/seed-doc-obligatorios.mjs
docker compose exec web node prisma/seed-roles-sgsi.mjs
```

- Aplicación: **http://localhost:3000**
- Salud del servicio de IA: **http://localhost:8000/health**

> Los archivos `.env` con secretos no se versionan; usa los `apps/*/.env.example` como
> referencia. El PDF de la norma ISO no se incluye por derechos de autor.

## Documentación

Consulta `docs/` (arquitectura y manual de despliegue) y la **Guía de instalación** del proyecto.
