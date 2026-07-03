"""HU — POST /v1/controls/suggest

Sugiere controles del Anexo A (ISO/IEC 27001:2022) que tratan los riesgos dados,
fundamentando con RAG sobre ISO/IEC 27002:2022. Lo llama Next.js, que persiste los
controles en la SoA con estado 'generado' para revisión del CISO.
"""

from fastapi import APIRouter, Depends

from app.security import require_api_key
from app.schemas import (
    ControlSuggestRequest, ControlSuggestResponse,
    ControlDocumentRequest, DocumentTemplateResponse,
)
from app.chains.control_suggester import suggest_controls
from app.chains.control_document import generate_control_document

router = APIRouter(prefix="/v1/controls", tags=["controls"], dependencies=[Depends(require_api_key)])


@router.post("/suggest", response_model=ControlSuggestResponse)
async def controls_suggest(req: ControlSuggestRequest) -> ControlSuggestResponse:
    return await suggest_controls(req)


@router.post("/document", response_model=DocumentTemplateResponse)
async def controls_document(req: ControlDocumentRequest) -> DocumentTemplateResponse:
    return await generate_control_document(req)
