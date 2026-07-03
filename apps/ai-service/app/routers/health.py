"""Health check — público (sin API key) para readiness/liveness probes."""

from fastapi import APIRouter
from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    s = get_settings()
    return {
        "status": "ok",
        "service": "ai-service",
        "llm_provider": "azure" if s.use_azure else "openai",
    }
