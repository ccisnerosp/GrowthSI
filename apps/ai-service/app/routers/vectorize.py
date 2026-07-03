"""HU57 — POST /v1/vectorize

Next.js llama a este endpoint tras cada CRUD de Contexto I/E. El AI service
embebe el texto y lo persiste en vector_chunk (su dominio). Devuelve los
tokens consumidos para que Next.js los registre en ia_uso.
"""

import json
from fastapi import APIRouter, Depends
from app.security import require_api_key
from app.schemas import (
    VectorizeRequest, VectorizeResponse,
    DeleteVectorsRequest, DeleteVectorsResponse,
)
from app.llm import get_embeddings
from app.config import get_settings
from app import db

router = APIRouter(prefix="/v1", tags=["vectorize"], dependencies=[Depends(require_api_key)])


@router.post("/vectorize", response_model=VectorizeResponse)
async def vectorize(req: VectorizeRequest) -> VectorizeResponse:
    s = get_settings()
    emb = get_embeddings()
    vector = await emb.aembed_query(req.chunk_texto)
    tokens = max(1, len(req.chunk_texto) // 4)  # estimación

    modelo = (
        s.azure_openai_embedding_deployment if s.use_azure else s.openai_embedding_model
    ) or "text-embedding-3-small"

    await db.upsert_tenant_chunk(
        organizacion_id=req.organizacion_id,
        tabla_origen=req.tabla_origen,
        registro_origen_id=req.registro_origen_id,
        campo_origen=req.campo_origen,
        chunk_texto=req.chunk_texto,
        tokens=tokens,
        embedding=vector,
        modelo=modelo,
        metadata_json=json.dumps(req.metadata or {}),
    )
    return VectorizeResponse(ok=True, tokens=tokens)


@router.post("/vectors/delete", response_model=DeleteVectorsResponse)
async def delete_vectors(req: DeleteVectorsRequest) -> DeleteVectorsResponse:
    deleted = await db.delete_record_vectors(
        organizacion_id=req.organizacion_id,
        tabla_origen=req.tabla_origen,
        registro_origen_id=req.registro_origen_id,
    )
    return DeleteVectorsResponse(ok=True, deleted=deleted)
