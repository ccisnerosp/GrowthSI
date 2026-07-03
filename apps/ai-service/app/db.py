"""Acceso a Postgres + pgvector con asyncpg (conexión propia, NO Prisma).

El AI service owna las tablas de vectores:
  · vector_global  — knowledge base compartida (ISO 27001, etc.)
  · vector_chunk   — vectores por tenant (datos del SGSI)

Las tablas las creó/migró Prisma desde Next.js; aquí solo las consultamos
y escribimos vía SQL parametrizado. asyncpg no es Prisma → cumple la regla.
"""

import hashlib
from typing import Any
import asyncpg

from app.config import get_settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    if _pool is None:
        s = get_settings()
        _pool = await asyncpg.create_pool(dsn=s.database_url, min_size=1, max_size=10)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def _pool_or_raise() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool no inicializado")
    return _pool


def _vector_literal(vec: list[float]) -> str:
    """pgvector espera el formato '[1,2,3]'."""
    return "[" + ",".join(repr(float(x)) for x in vec) + "]"


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ── vector_global (knowledge base) ───────────────────────────────────────
async def count_global_chunks(fuente: str) -> int:
    pool = _pool_or_raise()
    row = await pool.fetchrow(
        "SELECT COUNT(*)::bigint AS n FROM vector_global WHERE fuente = $1", fuente
    )
    return int(row["n"]) if row else 0


async def search_global(
    query_vector: list[float], k: int = 6, fuentes: list[str] | None = None
) -> list[dict[str, Any]]:
    pool = _pool_or_raise()
    vlit = _vector_literal(query_vector)
    if fuentes:
        rows = await pool.fetch(
            """
            SELECT fuente, documento, seccion, chunk_texto,
                   1 - (embedding <=> $1::vector) AS score
            FROM vector_global
            WHERE fuente = ANY($2::text[])
            ORDER BY embedding <=> $1::vector
            LIMIT $3
            """,
            vlit, fuentes, k,
        )
    else:
        rows = await pool.fetch(
            """
            SELECT fuente, documento, seccion, chunk_texto,
                   1 - (embedding <=> $1::vector) AS score
            FROM vector_global
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            vlit, k,
        )
    return [dict(r) for r in rows]


async def insert_global_chunk(
    *, fuente: str, documento: str, seccion: str | None, chunk_indice: int,
    chunk_texto: str, tokens: int, embedding: list[float], modelo: str, metadata_json: str,
) -> bool:
    """Inserta un chunk global. Devuelve False si ya existía (idempotente)."""
    pool = _pool_or_raise()
    h = sha256(chunk_texto)
    exists = await pool.fetchrow(
        "SELECT id FROM vector_global WHERE fuente = $1 AND chunk_hash = $2 LIMIT 1",
        fuente, h,
    )
    if exists:
        return False
    await pool.execute(
        """
        INSERT INTO vector_global
          (fuente, documento, seccion, chunk_indice, chunk_texto, chunk_hash,
           tokens, embedding, modelo_embedding, metadata, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9,$10::jsonb, now())
        """,
        fuente, documento, seccion, chunk_indice, chunk_texto, h,
        tokens, _vector_literal(embedding), modelo, metadata_json,
    )
    return True


# ── vector_chunk (por tenant) ────────────────────────────────────────────
async def upsert_tenant_chunk(
    *, organizacion_id: int, tabla_origen: str, registro_origen_id: int,
    campo_origen: str, chunk_texto: str, tokens: int, embedding: list[float],
    modelo: str, metadata_json: str,
) -> None:
    """Reemplaza el vector de un registro del tenant (borra previo + inserta)."""
    pool = _pool_or_raise()
    h = sha256(chunk_texto)
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                DELETE FROM vector_chunk
                WHERE organizacion_id = $1 AND tabla_origen = $2
                  AND registro_origen_id = $3 AND campo_origen = $4
                """,
                organizacion_id, tabla_origen, registro_origen_id, campo_origen,
            )
            await conn.execute(
                """
                INSERT INTO vector_chunk
                  (organizacion_id, tabla_origen, registro_origen_id, campo_origen,
                   chunk_indice, chunk_texto, chunk_hash, tokens,
                   embedding, modelo_embedding, metadata, created_at)
                VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8::vector,$9,$10::jsonb, now())
                """,
                organizacion_id, tabla_origen, registro_origen_id, campo_origen,
                chunk_texto, h, tokens, _vector_literal(embedding), modelo, metadata_json,
            )


async def delete_record_vectors(
    *, organizacion_id: int, tabla_origen: str, registro_origen_id: int
) -> int:
    """Borra todos los vectores de un registro del tenant (al eliminar el registro)."""
    pool = _pool_or_raise()
    result = await pool.execute(
        """
        DELETE FROM vector_chunk
        WHERE organizacion_id = $1 AND tabla_origen = $2 AND registro_origen_id = $3
        """,
        organizacion_id, tabla_origen, registro_origen_id,
    )
    # asyncpg devuelve "DELETE N"
    try:
        return int(result.split()[-1])
    except (ValueError, IndexError):
        return 0
