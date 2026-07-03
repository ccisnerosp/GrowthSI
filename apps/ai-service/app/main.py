"""AI Service — FastAPI app.

Motor de IA del SGSI. Proceso independiente (puerto 8000). Solo Next.js lo
llama (header X-API-Key). El navegador NUNCA lo alcanza directamente.

Endpoints:
  GET  /health                  — liveness/readiness (público)
  POST /v1/scope/preliminary    — HU58 alcance preliminar (RAG ISO)
  POST /v1/vectorize            — HU57 vectorizar registro del tenant
  POST /v1/vectors/delete       — HU57 borrar vectores de un registro
  POST /v1/ingest/iso           — ingestar PDF (ISO 27001/27005/27002) al KB
  POST /v1/documents/template   — HU59 generar plantilla de documento
  POST /v1/risks/suggest        — HU60/HU61 sugerir escenarios de riesgo (4 dominios)
  POST /v1/controls/suggest     — sugerir controles del Anexo A para la SoA (RAG ISO 27002)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI

from app import db
from app.routers import health, scope, vectorize, ingest, documents, risks, controls


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(
    title="GrowthSI AI Service",
    description="Motor de IA (LangChain + Azure/OpenAI) para el SGSI ISO 27001:2022",
    version="0.1.0",
    lifespan=lifespan,
)

# Nota de CORS: NO habilitamos CORS amplio a propósito. El navegador no debe
# llamar a este servicio; solo Next.js (server-to-server, sin preflight CORS).

app.include_router(health.router)
app.include_router(scope.router)
app.include_router(vectorize.router)
app.include_router(ingest.router)
app.include_router(documents.router)
app.include_router(risks.router)
app.include_router(controls.router)
