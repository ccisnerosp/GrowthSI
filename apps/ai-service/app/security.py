"""Autenticación servicio-a-servicio.

El AI service solo acepta llamadas que traigan el header X-API-Key con el
secreto compartido. Como el navegador nunca tiene ese secreto, solo Next.js
(el intermediario) puede invocar al AI service. En producción además el
ingress es 'internal', así que el servicio ni siquiera es alcanzable desde
fuera del entorno de Container Apps.
"""

from fastapi import Header, HTTPException, status
from app.config import get_settings


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    s = get_settings()
    if not x_api_key or x_api_key != s.ai_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key inválido o ausente",
        )
