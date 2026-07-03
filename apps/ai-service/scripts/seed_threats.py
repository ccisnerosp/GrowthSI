"""Job B — (Re)vectorización OFFLINE de las fuentes de amenazas curadas.

Pipeline IA #5 / Job B: este script vectoriza los catálogos curados
(MITRE ATT&CK, ENISA) en `vector_global`. Está pensado para ejecutarse de
forma PROGRAMADA (cron), NO en cada request del sugeridor.

  · En dev:  python scripts/seed_threats.py
  · En prod: Azure Container Apps Job programado (cron) que ejecuta esto.

Es idempotente: `insert_global_chunk` omite chunks ya existentes (hash).

Las fuentes basadas en PDF (ISO 27005 → base_iso_27005_amenazas, ISO 27002)
NO se siembran aquí: se ingieren con el endpoint /v1/ingest/iso (ver
scripts/ingest_pdfs.sh / README).
"""

import asyncio
import json
import os
import sys

# Permite `from app...` al ejecutar el script directamente.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import db  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.llm import get_embeddings  # noqa: E402
from app.data.threat_catalog import THREAT_SOURCES  # noqa: E402


async def seed() -> None:
    s = get_settings()
    await db.init_pool()
    emb = get_embeddings()
    modelo = (
        s.azure_openai_embedding_deployment if s.use_azure else s.openai_embedding_model
    ) or "text-embedding-3-small"

    total_persisted = total_skipped = 0
    try:
        for src in THREAT_SOURCES:
            entries = src["entries"]
            texts = [e["texto"] for e in entries]
            print(f"\n[{src['fuente']}] embeddings de {len(texts)} amenazas ({src['dominio']})…")
            vectors = await emb.aembed_documents(texts)

            persisted = skipped = 0
            for i, (entry, vector) in enumerate(zip(entries, vectors)):
                tokens = max(1, len(entry["texto"]) // 4)
                ok = await db.insert_global_chunk(
                    fuente=src["fuente"],
                    documento=src["documento"],
                    seccion=entry["ref"],
                    chunk_indice=i,
                    chunk_texto=entry["texto"],
                    tokens=tokens,
                    embedding=vector,
                    modelo=modelo,
                    metadata_json=json.dumps({
                        "dominio": src["dominio"],
                        "tipo_contenido": src["tipo_contenido"],
                        "ref": entry["ref"],
                    }),
                )
                persisted += 1 if ok else 0
                skipped += 0 if ok else 1
            total_persisted += persisted
            total_skipped += skipped
            print(f"  → insertados {persisted}, omitidos (ya existían) {skipped}")

        print(f"\nJob B completo. Total insertados {total_persisted}, omitidos {total_skipped}.")
    finally:
        await db.close_pool()


if __name__ == "__main__":
    asyncio.run(seed())
