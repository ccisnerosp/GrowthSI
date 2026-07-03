"""HU59 — POST /v1/documents/template

Genera la plantilla HTML de un documento obligatorio del SGSI (RAG sobre ISO).
"""

from fastapi import APIRouter, Depends
from app.security import require_api_key
from app.schemas import DocumentTemplateRequest, DocumentTemplateResponse
from app.chains.document_chain import generate_document_template

router = APIRouter(prefix="/v1/documents", tags=["documents"], dependencies=[Depends(require_api_key)])


@router.post("/template", response_model=DocumentTemplateResponse)
async def document_template(req: DocumentTemplateRequest) -> DocumentTemplateResponse:
    return await generate_document_template(req)
