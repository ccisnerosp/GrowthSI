"""HU60/HU61 — POST /v1/risks/suggest

Sugiere escenarios de riesgo en los 4 dominios ISO 27001:2022, combinando RAG
offline (vector_global) y NVD online. Lo llama Next.js, que persiste los
escenarios resultantes con estado 'generado' para revisión del CISO.
"""

from fastapi import APIRouter, Depends

from app.security import require_api_key
from app.schemas import RiskSuggestRequest, RiskSuggestResponse
from app.chains.risk_suggester import suggest_risks

router = APIRouter(prefix="/v1/risks", tags=["risks"], dependencies=[Depends(require_api_key)])


@router.post("/suggest", response_model=RiskSuggestResponse)
async def risks_suggest(req: RiskSuggestRequest) -> RiskSuggestResponse:
    return await suggest_risks(req)
