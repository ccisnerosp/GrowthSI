"""Job B (variante) — Ingesta del workbook oficial de MITRE ATT&CK Enterprise.

Vectoriza la hoja `techniques` del Excel oficial de ATT&CK en `vector_global`:
  · fuente base_mitre_attack_enterprise (dominio tecnológico) — TODAS las técnicas.
  · fuente base_mitre_attack_social_eng (dominio personas) — subconjunto de
    ingeniería social/phishing/factor humano (también se citan en el enterprise).

Uso:
  python scripts/seed_mitre_xlsx.py "C:/ruta/enterprise-attack-v19.1.xlsx"

Idempotente: insert_global_chunk omite por hash. Para reemplazar una versión
previa, borra antes los chunks de esas fuentes en vector_global.
"""

import asyncio
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import openpyxl  # noqa: E402

from app import db  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.llm import get_embeddings  # noqa: E402

# Señales de ingeniería social / factor humano → dominio "personas".
_SOCIAL_RE = re.compile(
    r"(phish|spearphish|social engineer|impersonat|pretext|\blure\b|deceiv|"
    r"\buser execution\b|masquerad.*user|fraud)",
    re.IGNORECASE,
)

_CITATION_RE = re.compile(r"\(Citation:[^)]*\)")
_MDLINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_WS_RE = re.compile(r"\s+")


def _clean(desc: str) -> str:
    if not desc:
        return ""
    txt = _MDLINK_RE.sub(r"\1", desc)      # [texto](url) → texto
    txt = _CITATION_RE.sub("", txt)        # (Citation: ...) → ""
    txt = txt.replace("`", "")
    txt = _WS_RE.sub(" ", txt).strip()
    return txt[:1200]


def _read_techniques(path: str) -> list[dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["techniques"]
    rows = ws.iter_rows(values_only=True)
    header = [str(h).strip().lower() if h is not None else "" for h in next(rows)]
    idx = {name: i for i, name in enumerate(header)}

    def g(row, col):
        i = idx.get(col)
        return row[i] if i is not None and i < len(row) else None

    out = []
    for row in rows:
        tid = g(row, "id")
        name = g(row, "name")
        if not tid or not name:
            continue
        desc = _clean(str(g(row, "description") or ""))
        tactics = str(g(row, "tactics") or "").replace(",", ", ")
        platforms = str(g(row, "platforms") or "")
        is_sub = str(g(row, "is sub-technique") or "").strip().lower() in ("true", "1", "yes")
        parent = str(g(row, "sub-technique of") or "")
        nombre = f"{parent}: {name}" if (is_sub and parent) else str(name)
        texto = (
            f"MITRE ATT&CK {tid} — {nombre}. "
            f"Táctica(s): {tactics or 'N/D'}. Plataformas: {platforms or 'N/D'}. {desc}"
        ).strip()
        out.append({
            "id": str(tid), "nombre": nombre, "texto": texto,
            "tactics": tactics, "platforms": platforms, "is_sub": is_sub,
        })
    return out


async def _ingest_batch(entries, fuente, documento, dominio, tipo_contenido, emb, modelo):
    persisted = skipped = 0
    BATCH = 96
    for start in range(0, len(entries), BATCH):
        batch = entries[start:start + BATCH]
        vectors = await emb.aembed_documents([e["texto"] for e in batch])
        for j, (e, vec) in enumerate(zip(batch, vectors)):
            ok = await db.insert_global_chunk(
                fuente=fuente,
                documento=documento,
                seccion=e["id"],
                chunk_indice=start + j,
                chunk_texto=e["texto"],
                tokens=max(1, len(e["texto"]) // 4),
                embedding=vec,
                modelo=modelo,
                metadata_json=json.dumps({
                    "dominio": dominio,
                    "tipo_contenido": tipo_contenido,
                    "ref": e["id"],
                    "tactics": e["tactics"],
                    "platforms": e["platforms"],
                    "is_sub": e["is_sub"],
                }),
            )
            persisted += 1 if ok else 0
            skipped += 0 if ok else 1
        print(f"  {fuente}: {min(start + BATCH, len(entries))}/{len(entries)}")
    return persisted, skipped


async def main(path: str) -> None:
    s = get_settings()
    await db.init_pool()
    emb = get_embeddings()
    modelo = (s.azure_openai_embedding_deployment if s.use_azure else s.openai_embedding_model) or "text-embedding-3-small"

    techniques = _read_techniques(path)
    social = [e for e in techniques if _SOCIAL_RE.search(e["nombre"]) or _SOCIAL_RE.search(e["texto"])]
    print(f"Técnicas leídas: {len(techniques)} | subconjunto ingeniería social: {len(social)}")

    try:
        print("\n[base_mitre_attack_enterprise] (tecnológico)…")
        p1, s1 = await _ingest_batch(
            techniques, "base_mitre_attack_enterprise", "MITRE ATT&CK Enterprise v19.1",
            "tecnologico", "tecnica_ataque", emb, modelo,
        )
        print(f"\n[base_mitre_attack_social_eng] (personas)…")
        p2, s2 = await _ingest_batch(
            social, "base_mitre_attack_social_eng", "MITRE ATT&CK Enterprise v19.1 (ingeniería social)",
            "personas", "tecnica_ingenieria_social", emb, modelo,
        )
        print(f"\nListo. Enterprise: +{p1} (omitidos {s1}). Social: +{p2} (omitidos {s2}).")
    finally:
        await db.close_pool()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/seed_mitre_xlsx.py <ruta-al-xlsx>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
