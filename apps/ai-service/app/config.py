"""Configuración del AI service. Lee variables de entorno.

Soporta dos providers de LLM (decisión PO):
  · Azure OpenAI Service (producción) — si AZURE_OPENAI_ENDPOINT está seteado.
  · OpenAI directo (desarrollo local) — si solo OPENAI_API_KEY está seteado.

El servicio se conecta a su PROPIO Postgres con asyncpg (NO Prisma).
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Base de datos (mismo Postgres que Next.js, pero conexión propia) ──
    # Formato asyncpg: postgresql://user:pass@host:port/db
    database_url: str = "postgresql://postgres:postgres@localhost:5432/growthsi"

    # ── Seguridad: secreto compartido con Next.js ────────────────────────
    # Next.js manda este token en el header X-API-Key. El navegador NUNCA
    # lo tiene → solo Next.js puede llamar al AI service.
    ai_service_api_key: str = "dev-shared-secret-change-me"

    # ── Azure OpenAI (producción) ────────────────────────────────────────
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_api_version: str = "2024-10-21"
    azure_openai_chat_deployment: str | None = None       # deployment de chat
    azure_openai_embedding_deployment: str | None = None  # deployment de text-embedding-3-small
    # Modelos de razonamiento (familia GPT-5/o-series): NO aceptan temperature
    # custom ni max_tokens (usan max_completion_tokens). Activar con env=true.
    azure_openai_reasoning: bool = False
    azure_openai_reasoning_effort: str = "low"  # minimal|low|medium|high

    # ── OpenAI directo (desarrollo) ──────────────────────────────────────
    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # ── Parámetros IA ────────────────────────────────────────────────────
    max_tokens_per_call: int = 2000
    chunk_size: int = 2400
    chunk_overlap: int = 200

    # ── NVD (Patrón B — consulta online por request) ─────────────────────
    # CVEs recientes para tecnologías de los activos. Funciona sin API key
    # (rate-limit bajo). Con NVD_API_KEY el límite es mucho mayor.
    nvd_api_key: str | None = None
    nvd_enabled: bool = True
    # Defaults pensados para PYME (Capa 1): ventana amplia y piso de severidad
    # bajo para no exigir parámetros exactos ni quedar en 0 resultados. Se
    # ordena por severidad, así lo crítico queda arriba igual.
    # NOTA: la NVD limita el rango de fechas a 120 días por request → nvd.py
    # hace clamp a ese máximo aunque aquí se configure un valor mayor.
    nvd_lookback_days: int = 120
    nvd_min_cvss: float = 4.0
    # Capa 2: normaliza el texto libre del activo (proveedor/modelo/versión) a
    # CPE oficial vía LLM y consulta la NVD por CPE (preciso y consciente de
    # versión). Si el LLM falla o no reconoce la tech, degrada a keyword limpia.
    nvd_cpe_normalize: bool = True

    @property
    def use_azure(self) -> bool:
        return bool(self.azure_openai_endpoint and self.azure_openai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
