"""Depura chunks RUIDO ya persistidos en vector_global (carátula, índice,
referencias/URLs) usando el mismo predicado que la ingesta (app.corpus_clean).

Por defecto SOLO reporta (dry-run). Para borrar de verdad: --apply.

  python scripts/clean_corpus.py                          # dry-run, fuentes ruidosas por defecto
  python scripts/clean_corpus.py --fuentes base_iso_27005_amenazas
  python scripts/clean_corpus.py --apply                  # ejecuta el borrado
  python scripts/clean_corpus.py --samples 8              # nº de ejemplos a mostrar
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.corpus_clean import is_noise_chunk  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

# Fuentes ingeridas desde PDF (con ruido). Las curadas (MITRE/ENISA físico) NO.
DEFAULT_FUENTES = ["base_enisa_threat_landscape", "base_iso_27005_amenazas"]


async def main() -> None:
    ap = argparse.ArgumentParser(description="Limpieza de chunks ruido en vector_global.")
    ap.add_argument("--fuentes", nargs="+", default=DEFAULT_FUENTES, help="fuentes a depurar")
    ap.add_argument("--apply", action="store_true", help="ejecuta el borrado (por defecto: dry-run)")
    ap.add_argument("--samples", type=int, default=6, help="nº de ejemplos de ruido a mostrar por fuente")
    args = ap.parse_args()

    conn = await asyncpg.connect(dsn=get_settings().database_url)
    try:
        gran_total = gran_ruido = 0
        for fz in args.fuentes:
            rows = await conn.fetch(
                "SELECT id, seccion, chunk_texto FROM vector_global WHERE fuente=$1 ORDER BY id", fz
            )
            ruido_ids, motivos, ejemplos = [], {}, []
            for r in rows:
                es_ruido, motivo = is_noise_chunk(r["chunk_texto"])
                if es_ruido:
                    ruido_ids.append(r["id"])
                    motivos[motivo] = motivos.get(motivo, 0) + 1
                    if len(ejemplos) < args.samples:
                        txt = re.sub(r"\s+", " ", r["chunk_texto"])[:110]
                        ejemplos.append(f"      [{motivo}] {txt}")
            total = len(rows)
            gran_total += total
            gran_ruido += len(ruido_ids)

            pct = (100 * len(ruido_ids) / total) if total else 0
            print(f"\n=== {fz} ===")
            print(f"  total: {total} | ruido: {len(ruido_ids)} ({pct:.1f}%) | se conservan: {total - len(ruido_ids)}")
            if motivos:
                print("  por motivo: " + ", ".join(f"{k}={v}" for k, v in sorted(motivos.items(), key=lambda x: -x[1])))
            if ejemplos:
                print("  ejemplos de ruido:")
                print("\n".join(ejemplos))

            if args.apply and ruido_ids:
                await conn.execute("DELETE FROM vector_global WHERE id = ANY($1::bigint[])", ruido_ids)
                print(f"  → BORRADOS {len(ruido_ids)} chunks.")

        modo = "APLICADO" if args.apply else "DRY-RUN (no se borró nada; usa --apply)"
        pct = (100 * gran_ruido / gran_total) if gran_total else 0
        print(f"\nResumen [{modo}]: {gran_ruido}/{gran_total} chunks ruido ({pct:.1f}%) en {len(args.fuentes)} fuente(s).")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
