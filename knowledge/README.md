# Knowledge base local — RAG global (compartido entre tenants)

Esta carpeta es para PDFs de **knowledge bases públicas** que alimentarán el RAG
compartido entre todos los tenants (tabla `vector_global` en Postgres).

> ⚠️ Esta carpeta está en `.gitignore`. Los PDFs (especialmente ISO 27001:2022
> oficial) suelen estar bajo licencia y no se commitean.

## Estado actual

| Archivo | Estado | Cómo ingestarlo |
|---------|--------|------------------|
| `ISO_IEC_27001_2022.pdf` | Pendiente | `npx tsx scripts/ingest-iso27001.ts ./knowledge/ISO_IEC_27001_2022.pdf` |

## Cuando promovamos a Azure

Estos PDFs vivirán en **Azure Blob Storage** (`growthsi-knowledge` container) y la
ingesta correrá en el **Azure Container App worker** disparada por un mensaje
en Azure Storage Queue. El código del pipeline (`lib/ai/ingestion/*`) es el
mismo — solo cambia el trigger:

```
Local dev:  CLI script  →  loadPdfChunks(localPath) → persistChunks(...)
Producción: Queue msg   →  loadPdfChunks(blobBuffer) → persistChunks(...)
```
