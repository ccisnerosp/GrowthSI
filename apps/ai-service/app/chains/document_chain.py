"""HU59 — Chain de generación de plantillas de documentos obligatorios.

Consumido por HU23 (botón "Generar plantilla con IA" en el módulo Documentos).

Flujo:
  1. Recibe tipo + nombre del documento + contexto de la organización.
  2. Retrieval: busca en vector_global (ISO 27001) las cláusulas/controles
     relevantes al tipo de documento.
  3. Prompt → LLM → devuelve HTML estructurado listo para el editor in-app.
  4. Devuelve también las citas (cláusulas usadas) y usage.
"""

import re

from langchain_core.prompts import ChatPromptTemplate

from app.llm import get_chat_model, get_embeddings
from app import db
from app.schemas import DocumentTemplateRequest, DocumentTemplateResponse, Cita, Usage

_NOMBRE_PROPIO_RE = re.compile(
    r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}\b"
)


def _anon_persona(nombre: str, tipo: str) -> str:
    """Anonimiza activos tipo 'Personas' (Ley 29733 / privacidad)."""
    if tipo != "Personas":
        return nombre
    cleaned = _NOMBRE_PROPIO_RE.sub("[persona anonimizada]", nombre)
    return "Personal interno (rol no nominado)" if cleaned.startswith("[persona") else cleaned


def _build_doc_context(req: DocumentTemplateRequest) -> str:
    """Contexto del documento: solo la INFORMACIÓN DENTRO DEL ALCANCE del SGSI."""
    o = req.organizacion

    def _sec(title: str, items: list[str]) -> list[str]:
        return [f"{title} ({len(items)}):", *items] if items else [f"{title}: (ninguno en alcance)"]

    def _loc(s) -> str:
        partes = [x for x in (s.distrito_sede, s.departamento_sede, s.pais_sede) if x]
        return f" — {', '.join(partes)}" if partes else ""

    lines = [
        f"Organización: {o.nombre_organizacion} | Sector: {o.sector} | Colaboradores: {o.numero_colaboradores}",
        f"Misión: {o.mision}",
        f"Declaración de alcance vigente (texto): {req.alcance_sgsi or '[no redactado aún]'}",
        "",
        "INFORMACIÓN DENTRO DEL ALCANCE DEL SGSI (cíñete SOLO a esto):",
        *_sec("  Sedes en alcance", [f"    · {s.codigo} {s.nombre_sede}{_loc(s)}" for s in req.sedes]),
        *_sec("  Procesos en alcance", [f"    · {p.codigo} {p.nombre} ({p.tipo}, área {p.area}, criticidad {p.criticidad})" for p in req.procesos]),
        *_sec("  Activos en alcance", [f"    · {a.codigo} {_anon_persona(a.nombre, a.tipo)} ({a.tipo}, clasif. {a.clasificacion}, valoración {a.valoracion})" for a in req.activos]),
        *_sec("  Factores I/E en alcance", [f"    · {f.codigo} [{f.origen}/{f.tipo}/{f.impacto}] {f.categoria}: {f.descripcion}" for f in req.factores]),
        *_sec("  Partes interesadas", [f"    · {p.codigo} {p.nombre} ({p.tipo}, relevancia {p.relevancia}): {p.expectativas}" for p in req.partes]),
        *_sec("  Roles del SGSI (cláusula 5.3)", [
            f"    · {r.codigo} {r.nombre} ({r.tipo})"
            + (f" — Responsabilidades: {r.responsabilidades}" if r.responsabilidades else "")
            + (f" | Autoridades: {r.autoridades}" if r.autoridades else "")
            for r in req.roles
        ]),
    ]
    return "\n".join(lines)

# Pista de búsqueda RAG por tipo de documento → qué parte de la ISO mirar.
_QUERY_BY_TIPO = {
    "Política":     "política de seguridad de la información cláusula 5.2 controles organizacionales A.5",
    "Procedimiento":"procedimiento operativo controles de la ISO 27001 Anexo A",
    "Plan":         "plan de continuidad de negocio A.5.30 A.8.13 planificación",
    "Instructivo":  "instructivo operativo de seguridad de la información",
    "Registro":     "información documentada registros evidencia cláusula 7.5",
    "Manual":       "manual del sistema de gestión de seguridad de la información",
}

SYSTEM = """Eres un consultor experto en ISO/IEC 27001:2022 que redacta plantillas de documentos del SGSI para una PYME.

Insumos:
1. EXTRACTOS de la ISO 27001:2022 (referencia normativa).
2. Metadatos del documento a generar (tipo, nombre).
3. CONTEXTO de la organización.

Reglas estrictas:
- Devuelve SOLO HTML válido para un editor rich-text (sin <html>, <head> ni <body>).
- Usa <h2> para secciones principales, <h3> para subsecciones, <p>, <ul><li>, <ol><li>, <strong>.
- NO uses estilos inline, scripts, imágenes ni tablas complejas.
- Estructura típica de un documento del SGSI: Objetivo, Alcance, Responsabilidades, Definiciones, Desarrollo/Lineamientos, Cumplimiento y sanciones, Control de cambios.
- Adapta el contenido al tipo de documento y al contexto de la organización (sector, alcance).
- Cíñete ESTRICTAMENTE a la INFORMACIÓN DENTRO DEL ALCANCE provista (sedes, procesos, activos, factores y partes interesadas). NO menciones procesos, sedes ni activos que no aparezcan en esa lista: lo que está fuera del alcance no debe figurar en el documento.
- Si el documento tiene una sección de Responsabilidades/roles, constrúyela a partir de los ROLES DEL SGSI provistos (cláusula 5.3), reflejando sus responsabilidades y autoridades.
- Si se proveen OBJETIVOS DEL SGSI (cláusula 6.2), alinea explícitamente el documento a ellos (especialmente en políticas): refleja la dirección que marcan y, donde aplique, cómo el documento contribuye a alcanzarlos.
- Redacta en español formal de Perú. Deja marcadores [COMPLETAR: ...] donde la organización deba precisar datos.
- No inventes datos del negocio que no estén en el contexto."""

USER = """EXTRACTOS ISO 27001:2022:
{iso}

DOCUMENTO A GENERAR:
- Tipo: {tipo}
- Nombre: {nombre}

CONTEXTO DE LA ORGANIZACIÓN:
{contexto}

OBJETIVOS DEL SGSI (cláusula 6.2):
{objetivos}

Genera la plantilla del documento en HTML."""


def _objetivos_block(objetivos) -> str:
    if not objetivos:
        return "(No hay objetivos del SGSI definidos aún.)"
    lines = []
    for o in objetivos:
        extra = []
        if o.indicador:
            extra.append(f"indicador: {o.indicador}")
        if o.meta:
            extra.append(f"meta: {o.meta}")
        suf = f" — {', '.join(extra)}" if extra else ""
        desc = f": {o.descripcion}" if o.descripcion else ""
        lines.append(f"  · [{o.codigo}] {o.nombre}{desc}{suf}")
    return "\n".join(lines)


async def generate_document_template(req: DocumentTemplateRequest) -> DocumentTemplateResponse:
    iso_count = await db.count_global_chunks("iso27001_2022")
    iso_chunks: list[dict] = []
    if iso_count > 0:
        query = _QUERY_BY_TIPO.get(req.tipo, "ISO 27001 documento del SGSI") + f". Documento: {req.nombre}."
        emb = get_embeddings()
        qv = await emb.aembed_query(query)
        iso_chunks = await db.search_global(qv, k=5, fuentes=["iso27001_2022"])

    iso_ctx = (
        "(Base de conocimiento ISO 27001 aún no ingestada — plantilla genérica sin referencias normativas.)"
        if not iso_chunks
        else "\n\n".join(
            f"[{i + 1}] {(c['seccion'] + ' — ') if c.get('seccion') else ''}{c['chunk_texto']}"
            for i, c in enumerate(iso_chunks)
        )
    )

    contexto = _build_doc_context(req)

    prompt = ChatPromptTemplate.from_messages([("system", SYSTEM), ("user", USER)])
    model = get_chat_model()
    messages = await prompt.aformat_messages(
        iso=iso_ctx, tipo=req.tipo, nombre=req.nombre, contexto=contexto,
        objetivos=_objetivos_block(req.objetivos),
    )
    ai_msg = await model.ainvoke(messages)
    html = (ai_msg.content if isinstance(ai_msg.content, str) else str(ai_msg.content)).strip()

    usage_meta = getattr(ai_msg, "usage_metadata", None) or {}
    usage = Usage(input=usage_meta.get("input_tokens", 0), output=usage_meta.get("output_tokens", 0))
    citas = [
        Cita(seccion=c.get("seccion"), documento=c["documento"], score=round(float(c["score"]), 3))
        for c in iso_chunks
    ]

    return DocumentTemplateResponse(
        contenido_html=html, citas=citas, usage=usage, iso_disponible=iso_count > 0
    )
