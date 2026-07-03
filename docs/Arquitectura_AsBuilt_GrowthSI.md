# Arquitectura física — AS-BUILT (estado actual)

**Proyecto:** GrowthSI · **Fecha:** 2026-06-03
**Criterio:** representa SOLO lo implementado/verificado en el código. Lo planificado-pero-no-integrado se lista aparte (§5).

---

## 1. Diagrama as-built

```
                               ┌────────────────────────────┐
                               │     Usuarios PYME (web)     │
                               └──────────────┬─────────────┘
                                              │ HTTPS
                                              ▼
                 ╔════════════════════════════════════════════════════╗
                 ║  AZURE CONTAINER APP — WEB        (ingress EXTERNO) ║  :3000
                 ║  Next.js 16.2.6 · React 19 · Turbopack             ║
                 ║  · Auth.js v5 (Credentials email+pwd+bcrypt, JWT)  ║
                 ║  · API transaccional + ÚNICO proxy hacia la IA     ║
                 ║  · Prisma ORM                                      ║
                 ║  · Adjuntos → filesystem local (.private-uploads)  ║
                 ╚═══════╤═══════════════════════════════════╤════════╝
            Prisma (SQL) │                                   │ HTTP + X-API-Key
                         │                                   │ (red interna del Environment)
                         │                                   ▼
                         │            ╔═══════════════════════════════════════════════╗
                         │            ║  AZURE CONTAINER APP — AI-SERVICE  (ingress   ║  :8000
                         │            ║  FastAPI + LangChain · Python 3.12   INTERNO) ║
                         │            ║  5 cadenas RAG + salvaguardas:                ║
                         │            ║   · alcance · plantilla-doc · sugerir-riesgos ║
                         │            ║   · sugerir-controles · documento-control     ║
                         │            ║   Patrón A: RAG offline    Patrón B: NVD live ║
                         │            ║   Salvaguardas: dedup semántica + guarda CVE  ║
                         │            ╚═══════╤══════════════════╤═══════════╤════════╝
                         │           asyncpg │          egress  │           │ egress
                         ▼                    ▼                  ▼           ▼
        ╔════════════════════════════════════════════╗  ┌──────────────────────┐  ┌─────────────────┐
        ║  AZURE DB FOR POSTGRESQL  +  pgvector       ║  │ Azure OpenAI / OpenAI │  │ NVD API (NIST)  │
        ║  (índice vectorial: scan exacto, sin HNSW)  ║  │ gpt-4o-mini (chat)    │  │ CVEs en vivo    │
        ║  · tablas transaccionales (Prisma, ~24)     ║  │ text-embedding-3-small│  │ CVSS≥7, 90 días │
        ║  · vector_global  (KB: ISO/MITRE/ENISA/27005)║ └──────────────────────┘  │ (Patrón B)      │
        ║  · vector_chunk   (vectores por tenant)     ║                            └─────────────────┘
        ╚════════════════════════════════════════════╝
```

> El navegador **nunca** llama al AI-service: solo `web` lo alcanza por la red interna con `X-API-Key`.
> El AI-service usa su **propio pool asyncpg** (no Prisma) y es dueño de las tablas de vectores.

---

## 2. Componentes (as-built)

| Componente | Tecnología real | Ingress | Acceso a datos |
|---|---|---|---|
| **web** | Azure Container App · Next.js 16.2.6 (Node 20) | Externo (TLS) | Prisma → Postgres; proxy → ai-service |
| **ai-service** | Azure Container App · FastAPI + LangChain (Python 3.12) | Interno | asyncpg → Postgres; egress → LLM + NVD |
| **base de datos** | Azure DB for PostgreSQL + pgvector | privado | compartida (Prisma + asyncpg) |
| **LLM** | Azure OpenAI / OpenAI · **gpt-4o-mini** + **text-embedding-3-small** | externo | — |
| **NVD** | API pública NIST (egress) | externo | — |

---

## 3. Flujo de una sugerencia IA (ej. sugerir riesgos)

1. Usuario (navegador) → **web** (HTTPS), sesión Auth.js (JWT).
2. **web** reúne el contexto del tenant con **Prisma** y llama a **ai-service** (red interna, `X-API-Key`).
3. **ai-service** recupera amenazas de **vector_global** (Patrón A, coseno) y, si hay activos con tecnología, consulta la **NVD** en vivo (Patrón B).
4. Genera con **gpt-4o-mini**; aplica **dedup semántica** (embeddings, umbral 0.85) y **guarda CVE** (elimina citas no provistas por NVD).
5. Devuelve propuestas (estado *generado*) → **web** las persiste con **Prisma**; el usuario revisa/acepta.

---

## 4. Almacenamiento de datos (as-built)

| Dato | Dónde está hoy |
|---|---|
| Tablas transaccionales del SGSI | PostgreSQL (Prisma, ~24 tablas) |
| Base de conocimiento (RAG) | PostgreSQL `vector_global` (~1.440 chunks: MITRE 697+136, ISO 27002 321, ISO 27005 141, ENISA 93+10, ISO 27001 42) |
| Vectores por organización | PostgreSQL `vector_chunk` |
| **Adjuntos / evidencias** | **Filesystem local del contenedor** (`.private-uploads`) — *efímero* |
| Secretos | `.env` (dev) / **ACA secrets** (prod) |

---

## 5. NO implementado aún (en el diagrama objetivo, fuera del as-built)

- **Entra ID / OIDC multi-org** → hoy Auth.js **Credentials** (campo `azure_oid` reservado, sin flujo OIDC).
- **Azure Key Vault** → secretos por `.env` / ACA secrets.
- **Azure Front Door + WAF** → no provisionado.
- **Blob Storage** para evidencias → hoy filesystem local.
- **Azure Document Intelligence** → la ingesta de PDF usa **PyPDFLoader (pypdf)**, no Document Intelligence.
- **Índice pgvector HNSW** → no creado (scan exacto; suficiente a esta escala).
- **Redis** → declarado en `docker-compose` pero **no usado** por el código (rate-limit en memoria, single-instance).

---

## 6. Leyenda

- **Patrón A (RAG offline):** recuperación sobre `vector_global`, sin llamadas externas.
- **Patrón B (NVD online):** consulta en vivo a la NVD solo si un activo tiene tecnología identificada (modelo+versión).
- **Pool tenancy:** una sola instancia de datos; aislamiento lógico por `organizacion_id`.
- **Ingress interno:** alcanzable solo dentro del Container Apps Environment (no desde Internet).

_As-built fiel al código verificado. Sin secretos ni datos reales._
