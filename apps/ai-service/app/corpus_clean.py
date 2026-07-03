"""Detector de chunks RUIDO en el knowledge base (vector_global).

Los PDFs (ENISA Threat Landscape, ISO/IEC 27005) aportan, además del contenido
útil, páginas de carátula/legales, índices y listas de referencias/URLs que
ensucian la recuperación (ocupan el top-k sin aportar). Este predicado los
identifica de forma CONSERVADORA (preferimos dejar algo de ruido antes que borrar
contenido real). Se usa en dos sitios:
  · ingesta (routers/ingest.py): se omiten antes de vectorizar.
  · limpieza (scripts/clean_corpus.py): se depuran los ya persistidos.
"""

from __future__ import annotations

import re

_URL_RE = re.compile(r"https?://\S+")
_WORD_RE = re.compile(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}")

# Marcadores fuertes de carátula / legales / copyright.
_LEGAL_MARKERS = (
    "prohibida su reproduccion", "prohibida su reproducción",
    "derechos reservados", "son reservados", "all rights reserved",
    "isbn", "ntp-iso", "© iso", "©iso",
)
_TOC_HINT = ("índice", "indice", "table of contents")


def is_noise_chunk(text: str) -> tuple[bool, str]:
    """Devuelve (es_ruido, motivo). Motivo vacío si es contenido útil."""
    t = (text or "").strip()
    if len(t) < 40:
        return True, "muy_corto"

    low = t.lower()

    # 1) Listas de referencias / URLs (típico de ENISA Threat Landscape).
    # Conservador: protege prosa con pocas referencias — exige que las URLs
    # ocupen una proporción significativa del chunk, no solo que haya ≥3.
    urls = _URL_RE.findall(t)
    share = (sum(len(u) for u in urls) / len(t)) if urls else 0.0
    if (len(urls) >= 3 and share > 0.15) or share > 0.30:
        return True, "lista_referencias_urls"

    # 2) Índice / tabla de contenidos (puntos guía + números de página).
    if re.search(r"\.{4,}\s*\d+", t) or (any(h in low for h in _TOC_HINT) and t.count("..") >= 3):
        return True, "indice_toc"

    # 3) Carátula / legales: marcador fuerte + poco contenido sustantivo.
    palabras = _WORD_RE.findall(t)
    if any(m in low for m in _LEGAL_MARKERS) and len(palabras) < 60:
        return True, "caratula_legal"

    # 4) Baja densidad de información (encabezados/pies, fragmentos sueltos).
    if len(palabras) < 12:
        return True, "baja_informacion"

    return False, ""
