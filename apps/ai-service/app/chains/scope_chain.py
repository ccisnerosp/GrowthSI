"""HU58 — Chain de alcance preliminar del SGSI (RAG sobre ISO 27001).

Portado desde la versión TS (app/api/ia/alcance-preliminar/route.ts).
Ahora vive en el AI service como una chain LCEL de LangChain.

Flujo:
  1. Recibe contexto del tenant (ya armado por Next.js desde Prisma).
  2. Retrieval: busca cláusulas relevantes de la ISO en vector_global.
  3. Prompt = extractos ISO + contexto tenant.
  4. LLM (Azure/OpenAI) → texto narrativo del alcance.
  5. Devuelve texto + citas + usage.
"""

import re
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.llm import get_chat_model, get_embeddings
from app import db
from app.schemas import ScopePreliminaryRequest, ScopePreliminaryResponse, Cita, Usage

ISO_QUERY = (
    "Cláusula 4 contexto de la organización alcance del sistema de gestión "
    "de seguridad de la información"
)

_NOMBRE_PROPIO_RE = re.compile(
    r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}\b"
)


def _anon_persona(nombre: str, tipo: str) -> str:
    """Anonimiza activos tipo 'Personas' (Ley 29733 / privacidad)."""
    if tipo != "Personas":
        return nombre
    cleaned = _NOMBRE_PROPIO_RE.sub("[persona anonimizada]", nombre)
    if cleaned.startswith("[persona"):
        return "Personal interno (rol no nominado)"
    return cleaned


SYSTEM = """Eres un consultor experto en ISO/IEC 27001:2022 ayudando a una PYME a redactar la Declaración del Alcance del SGSI (Cláusula 4.3).

Insumos que recibes:
1. EXTRACTOS de la ISO 27001:2022 oficial (cláusulas 4.1, 4.2, 4.3 principalmente) — base normativa.
2. CONTEXTO de la organización — sedes, procesos, activos, factores, partes interesadas.

Reglas estrictas:
- Devuelve únicamente el texto narrativo del alcance (entre 2 y 4 párrafos, ~150-300 palabras).
- NO uses encabezados, markdown, listas ni viñetas.
- NO marques sedes ni procesos como incluidos/excluidos; eso lo decide el usuario.
- Apóyate en lo que dice la ISO (sin citarla literalmente — parafrasea) para estructurar el alcance.
- Menciona explícitamente los procesos cubiertos, las sedes en alcance y el tipo de activos protegidos.
- Si hay procesos o sedes que el contexto sugiere fuera del alcance, inclúyelos como exclusiones justificadas al final.
- Idioma: español formal de Perú.
- No inventes datos: solo usa lo provisto en los insumos."""

USER = """EXTRACTOS ISO 27001:2022 (referencia normativa):
{iso}

CONTEXTO DE LA ORGANIZACIÓN:
{contexto}

Genera el alcance preliminar del SGSI integrando ambos insumos."""


def _build_tenant_context(req: ScopePreliminaryRequest) -> str:
    o = req.organizacion
    lines = [
        f"ORGANIZACIÓN: {o.nombre_organizacion} | Sector: {o.sector} | "
        f"Colaboradores: {o.numero_colaboradores} | Estado SGSI: {o.estado_sgsi}",
        f"MISIÓN: {o.mision}",
        f"VISIÓN: {o.vision}",
        "",
        f"SEDES ({len(req.sedes)}):",
        *[f"  · {s.codigo} {s.nombre_sede} — {s.distrito_sede}, {s.departamento_sede}, {s.pais_sede}" for s in req.sedes],
        "",
        f"PROCESOS ({len(req.procesos)}):",
        *[f"  · {p.codigo} {p.nombre} ({p.tipo}, área {p.area}, criticidad {p.criticidad}) — {p.descripcion}" for p in req.procesos],
        "",
        f"ACTIVOS DE INFORMACIÓN ({len(req.activos)}):",
        *[f"  · {a.codigo} {_anon_persona(a.nombre, a.tipo)} ({a.tipo}, clasif. {a.clasificacion}, valoración {a.valoracion})" for a in req.activos],
        "",
        f"FACTORES I/E ({len(req.factores)}):",
        *[f"  · {f.codigo} [{f.origen}/{f.tipo}/{f.impacto}] {f.categoria}: {f.descripcion}" for f in req.factores],
        "",
        f"PARTES INTERESADAS ({len(req.partes)}):",
        *[f"  · {p.codigo} {p.nombre} ({p.tipo}, relevancia {p.relevancia}): {p.expectativas}" for p in req.partes],
    ]
    return "\n".join(lines)


async def generate_scope_preliminary(req: ScopePreliminaryRequest) -> ScopePreliminaryResponse:
    # 1) RETRIEVAL sobre la ISO en vector_global
    iso_count = await db.count_global_chunks("iso27001_2022")
    iso_chunks: list[dict] = []
    if iso_count > 0:
        emb = get_embeddings()
        query_vec = await emb.aembed_query(f"{ISO_QUERY}. Sector: {req.organizacion.sector}.")
        iso_chunks = await db.search_global(query_vec, k=5, fuentes=["iso27001_2022"])

    def _fmt_chunk(i: int, c: dict) -> str:
        prefijo = f"{c['seccion']} — " if c.get("seccion") else ""
        cuerpo = re.sub(r"\s+", " ", c["chunk_texto"]).strip()
        return f"[{i + 1}] {prefijo}{cuerpo}"

    iso_ctx = (
        "(Base de conocimiento ISO 27001 aún no ingestada — generación sin referencias normativas explícitas.)"
        if not iso_chunks
        else "\n\n".join(_fmt_chunk(i, c) for i, c in enumerate(iso_chunks))
    )

    tenant_ctx = _build_tenant_context(req)

    # 2) Chain LCEL: prompt | modelo | parser
    prompt = ChatPromptTemplate.from_messages([("system", SYSTEM), ("user", USER)])
    model = get_chat_model()
    chain = prompt | model | StrOutputParser()

    # Invocamos el modelo directo (no la chain string) para capturar usage.
    messages = await prompt.aformat_messages(iso=iso_ctx, contexto=tenant_ctx)
    ai_msg = await model.ainvoke(messages)
    texto = (ai_msg.content if isinstance(ai_msg.content, str) else str(ai_msg.content)).strip()
    _ = chain  # patrón LCEL documentado para HU60/HU61

    usage_meta = getattr(ai_msg, "usage_metadata", None) or {}
    usage = Usage(
        input=usage_meta.get("input_tokens", 0),
        output=usage_meta.get("output_tokens", 0),
    )

    citas = [
        Cita(seccion=c.get("seccion"), documento=c["documento"], score=round(float(c["score"]), 3))
        for c in iso_chunks
    ]

    return ScopePreliminaryResponse(
        alcance=texto, citas=citas, usage=usage, iso_disponible=iso_count > 0
    )
