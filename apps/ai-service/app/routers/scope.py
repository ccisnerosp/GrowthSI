"""HU58 — POST /v1/scope/preliminary

Recibe el contexto del tenant (armado por Next.js desde Prisma) y devuelve
el alcance preliminar generado con RAG sobre la ISO 27001.
"""

from fastapi import APIRouter, Depends
from app.security import require_api_key
from app.schemas import ScopePreliminaryRequest, ScopePreliminaryResponse
from app.chains.scope_chain import generate_scope_preliminary

router = APIRouter(prefix="/v1/scope", tags=["scope"], dependencies=[Depends(require_api_key)])


@router.post("/preliminary", response_model=ScopePreliminaryResponse)
async def scope_preliminary(req: ScopePreliminaryRequest) -> ScopePreliminaryResponse:
    return await generate_scope_preliminary(req)
