"""Ingesta de PDFs al knowledge base global (vector_global).

POST /v1/ingest/iso  — sube el PDF de la ISO 27001:2022.
En dev: subes el archivo por multipart. En prod (worker): el mensaje de la
Storage Queue trae el blob_url y el worker lo descarga y lo manda aquí.
"""

import re
import json
import tempfile
import os
from fastapi import APIRouter, Depends, UploadFile, File, Form
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.security import require_api_key
from app.schemas import IngestResponse
from app.llm import get_embeddings
from app.config import get_settings
from app.corpus_clean import is_noise_chunk
from app import db

router = APIRouter(prefix="/v1/ingest", tags=["ingest"], dependencies=[Depends(require_api_key)])

_SECTION_RE = re.compile(r"\b(A\.\d+(?:\.\d+)?|Cláusula\s+\d+(?:\.\d+)?)\b")


def _infer_seccion(text: str) -> str | None:
    m = _SECTION_RE.search(text[:200])
    return m.group(1) if m else None


@router.post("/iso", response_model=IngestResponse)
async def ingest_iso(
    file: UploadFile = File(...),
    # Genérico: por defecto ingesta la ISO 27001, pero permite cargar otras
    # fuentes globales (ISO 27005/27002, reportes sectoriales) a su propia
    # `fuente`. El sugeridor de riesgos usa, p. ej., 'base_iso_27005_amenazas'.
    fuente: str = Form("iso27001_2022"),
    documento_label: str | None = Form(None),
    dominio: str | None = Form(None),
    tipo_contenido: str | None = Form(None),
) -> IngestResponse:
    s = get_settings()
    raw = await file.read()

    # PyPDFLoader necesita una ruta; escribimos a un temp.
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(raw)
            tmp_path = tmp.name
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=s.chunk_size,
        chunk_overlap=s.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    # Filtro de ruido: descarta carátula/índice/referencias antes de vectorizar
    # (no ensucian la recuperación ni gastan embeddings).
    filtrados = 0
    limpios = []
    for c in chunks:
        ruido, _motivo = is_noise_chunk(c.page_content)
        if ruido:
            filtrados += 1
        else:
            limpios.append(c)
    chunks = limpios

    emb = get_embeddings()
    texts = [c.page_content for c in chunks]
    vectors = await emb.aembed_documents(texts) if texts else []

    modelo = (
        s.azure_openai_embedding_deployment if s.use_azure else s.openai_embedding_model
    ) or "text-embedding-3-small"

    doc_label = documento_label or file.filename or f"{fuente}.pdf"

    persisted = skipped = total_tokens = 0
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        text = chunk.page_content
        seccion = _infer_seccion(text)
        # Para la ISO 27001 derivamos el "dominio" de la cláusula del Anexo A;
        # para otras fuentes usamos el dominio recibido por parámetro.
        dom = dominio
        if dom is None and seccion:
            md = re.match(r"^A\.(\d+)", seccion)
            dom = f"A.{md.group(1)}" if md else None
        tokens = max(1, len(text) // 4)
        total_tokens += tokens
        ok = await db.insert_global_chunk(
            fuente=fuente,
            documento=doc_label,
            seccion=seccion,
            chunk_indice=i,
            chunk_texto=text,
            tokens=tokens,
            embedding=vector,
            modelo=modelo,
            metadata_json=json.dumps({
                "seccion": seccion,
                "dominio": dom,
                "tipo_contenido": tipo_contenido,
                "page": chunk.metadata.get("page"),
            }),
        )
        if ok:
            persisted += 1
        else:
            skipped += 1

    return IngestResponse(chunks_persisted=persisted, chunks_skipped=skipped, total_tokens=total_tokens, chunks_filtrados=filtrados)
