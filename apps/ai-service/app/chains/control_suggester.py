"""Sugeridor de controles del Anexo A para la SoA (Declaración de Aplicabilidad).

Dado el conjunto de riesgos a tratar (típicamente 'mitigar') + el contexto de la
organización, propone qué controles del Anexo A (ISO/IEC 27001:2022) los tratan,
redacta la justificación citando ISO/IEC 27002:2022 (RAG offline) e indica qué
riesgos cubre cada control. Relación N:N: un control puede cubrir varios riesgos.

La evaluación es PRELIMINAR (estado 'generado'): el CISO la revisa y acepta/descarta.
"""

from __future__ import annotations

import re

from langchain_core.prompts import ChatPromptTemplate

from app import db
from app.llm import get_chat_model, get_embeddings
from app.chains.risk_suggester import _parse_json
from app.schemas import ControlSuggestRequest, ControlSuggestResponse, SuggestedControl, Usage

_FUENTE_ISO_27002 = "base_iso_27002_controles"

SYSTEM = """Eres un consultor experto en ISO/IEC 27001:2022 e ISO/IEC 27002:2022 que ayuda a una PYME a construir su Declaración de Aplicabilidad (SoA, cláusula 6.1.3.d).

Tu tarea: seleccionar los controles del Anexo A que TRATAN los riesgos dados y justificar su aplicabilidad.

Insumos:
1. CONTEXTO de la organización.
2. OBJETIVOS DEL SGSI (cláusula 6.2) — la dirección que la selección de controles debe apoyar.
3. RIESGOS A TRATAR (con su dominio, nivel, amenaza y vulnerabilidad).
4. CATÁLOGO DE CONTROLES válidos del Anexo A — SOLO puedes usar códigos de esta lista.
5. GUÍA ISO 27002 — extractos de la norma para fundamentar la justificación.
6. CONTROLES YA EN LA SOA — controles que la organización ya seleccionó; puedes REUTILIZARLOS para tratar los riesgos nuevos (no los dupliques).

Reglas estrictas:
- Un control puede tratar VARIOS riesgos: agrúpalos. Devuelve UNA entrada por control, no una por riesgo.
- Cubre TODOS los riesgos dados: cada riesgo debe quedar tratado por al menos un control.
- REUTILIZA un control que YA está en la SoA cuando sea el adecuado para un riesgo nuevo (devuélvelo con su código y los riesgos que cubre); añade un control nuevo del catálogo SOLO si ninguno de los existentes es apropiado.
- Prioriza los controles que, además de tratar los riesgos, contribuyen a los OBJETIVOS DEL SGSI; cuando un control apoye un objetivo, menciónalo en la justificación.
- Propón el conjunto MÍNIMO y pertinente de controles (no listes los 93).
- 'codigo' debe existir EXACTAMENTE en el catálogo (p. ej. 'A.8.7').
- 'justificacion': por qué aplica este control para estos riesgos, citando la guía ISO 27002. Concreta, en español formal de Perú.
- 'riesgos_cubiertos': lista de códigos de riesgo (de los provistos) que este control trata.
- Responde ÚNICAMENTE con JSON válido, sin texto ni markdown, con esta forma:
{{"controles": [{{"codigo": "A.8.7", "justificacion": "...", "riesgos_cubiertos": ["R-001", "R-003"], "fuente_referencia": "ISO/IEC 27002:2022 8.7"}}]}}"""

USER = """CONTEXTO DE LA ORGANIZACIÓN:
{contexto}

ALCANCE DEL SGSI: {alcance}

OBJETIVOS DEL SGSI (cláusula 6.2):
{objetivos}

RIESGOS A TRATAR:
{riesgos}

CATÁLOGO DE CONTROLES DEL ANEXO A (usa SOLO estos códigos):
{catalogo}

GUÍA ISO/IEC 27002:2022 (fundamento para las justificaciones):
{guia}

CONTROLES YA EN LA SOA (puedes reutilizarlos para los riesgos nuevos): {existentes}

Devuelve solo el JSON con los controles que tratan los riesgos."""


def _build_context(req: ControlSuggestRequest) -> str:
    o = req.organizacion
    return (
        f"ORGANIZACIÓN: {o.nombre_organizacion} | Sector: {o.sector} | "
        f"Colaboradores: {o.numero_colaboradores}\nMISIÓN: {o.mision}"
    )


def _riesgos_block(req: ControlSuggestRequest) -> str:
    lines = []
    for r in req.riesgos:
        lines.append(
            f"  · [{r.codigo}] {r.nombre} (dominio {r.dominio or 'N/D'}, nivel {r.nivel_actual}). "
            f"Amenaza: {r.amenaza or 'N/D'}. Vulnerabilidad: {r.vulnerabilidad or 'N/D'}."
        )
    return "\n".join(lines) or "  (ninguno)"


def _catalogo_block(req: ControlSuggestRequest) -> str:
    return "\n".join(f"  {c.codigo} — {c.nombre}" for c in req.controles_catalogo) or "  (vacío)"


def _objetivos_block(req: ControlSuggestRequest) -> str:
    if not req.objetivos:
        return "  (No hay objetivos del SGSI definidos aún.)"
    lines = []
    for o in req.objetivos:
        extra = []
        if o.indicador:
            extra.append(f"indicador: {o.indicador}")
        if o.meta:
            extra.append(f"meta: {o.meta}")
        suf = f" — {', '.join(extra)}" if extra else ""
        desc = f": {o.descripcion}" if o.descripcion else ""
        lines.append(f"  · [{o.codigo}] {o.nombre}{desc}{suf}")
    return "\n".join(lines)


async def suggest_controls(req: ControlSuggestRequest) -> ControlSuggestResponse:
    catalogo_set = {c.codigo for c in req.controles_catalogo}
    riesgo_set = {r.codigo for r in req.riesgos}
    existentes_set = {c.strip() for c in req.controles_existentes}

    # ── RAG: guía ISO 27002 relevante a los riesgos a tratar ─────────────
    iso_disponible = (await db.count_global_chunks(_FUENTE_ISO_27002)) > 0
    guia = "(Sin guía ISO 27002 ingestada — usa conocimiento general de la norma.)"
    if iso_disponible and req.riesgos:
        emb = get_embeddings()
        query = "Controles de seguridad para tratar: " + "; ".join(
            f"{r.amenaza} {r.vulnerabilidad} {r.nombre}".strip() for r in req.riesgos[:12]
        )
        qv = await emb.aembed_query(query)
        chunks = await db.search_global(qv, k=10, fuentes=[_FUENTE_ISO_27002])
        partes = []
        for i, c in enumerate(chunks):
            ref = (c.get("seccion") + " — ") if c.get("seccion") else ""
            cuerpo = re.sub(r"\s+", " ", c["chunk_texto"]).strip()
            partes.append(f"[{i + 1}] {ref}{cuerpo}")
        if partes:
            guia = "\n".join(partes)

    # ── Prompt → LLM (JSON mode) → JSON ──────────────────────────────────
    prompt = ChatPromptTemplate.from_messages([("system", SYSTEM), ("user", USER)])
    model = get_chat_model().bind(response_format={"type": "json_object"})
    messages = await prompt.aformat_messages(
        contexto=_build_context(req),
        alcance=req.alcance_sgsi or "[no definido aún]",
        objetivos=_objetivos_block(req),
        riesgos=_riesgos_block(req),
        catalogo=_catalogo_block(req),
        guia=guia,
        existentes=", ".join(sorted(existentes_set)) or "(ninguno)",
    )
    ai_msg = await model.ainvoke(messages)
    content = ai_msg.content if isinstance(ai_msg.content, str) else str(ai_msg.content)

    parsed = _parse_json(content)
    raw = parsed.get("controles", []) if isinstance(parsed, dict) else []

    controles: list[SuggestedControl] = []
    vistos: set[str] = set()
    for c in raw:
        if not isinstance(c, dict):
            continue
        codigo = str(c.get("codigo", "")).strip()
        # Solo códigos válidos del catálogo y no repetidos dentro de esta respuesta.
        # Los que YA están en la SoA SÍ se admiten: el backend los reutiliza
        # (añade solo los enlaces de riesgo faltantes), no crea duplicados.
        if codigo not in catalogo_set or codigo in vistos:
            continue
        cubiertos = [str(x).strip() for x in (c.get("riesgos_cubiertos") or []) if str(x).strip() in riesgo_set]
        controles.append(SuggestedControl(
            codigo=codigo,
            justificacion=str(c.get("justificacion", "")).strip(),
            riesgos_cubiertos=cubiertos,
            fuente_referencia=str(c.get("fuente_referencia", "")).strip()[:120],
        ))
        vistos.add(codigo)

    usage_meta = getattr(ai_msg, "usage_metadata", None) or {}
    usage = Usage(input=usage_meta.get("input_tokens", 0), output=usage_meta.get("output_tokens", 0))

    return ControlSuggestResponse(controles=controles, iso_disponible=iso_disponible, usage=usage)
