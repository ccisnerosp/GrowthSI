"""Genera el DOCUMENTO DE EVIDENCIA de un control del Anexo A.

Para un control que aplica (y no tiene evidencia), produce un documento de
implementación estructurado según la guía de ISO/IEC 27002:2022 (RAG offline
sobre base_iso_27002_controles). El resultado es HTML para el editor in-app del
módulo Documentos; Next.js lo guarda como un Documento de tipo 'Control' y lo
enlaza como evidencia del control en la SoA.
"""

from langchain_core.prompts import ChatPromptTemplate

from app import db
from app.llm import get_chat_model, get_embeddings
from app.schemas import ControlDocumentRequest, DocumentTemplateResponse, Cita, Usage

_FUENTE_ISO_27002 = "base_iso_27002_controles"

SYSTEM = """Eres un consultor experto en ISO/IEC 27002:2022 que redacta, para una PYME, el documento de implementación de un control del Anexo A (que servirá como evidencia en la Declaración de Aplicabilidad).

Insumos:
1. GUÍA ISO/IEC 27002:2022 — extractos de la norma para ESTE control (propósito y orientación de implementación).
2. CONTROL a documentar (código y nombre del Anexo A).
3. CONTEXTO de la organización.

Reglas estrictas:
- Devuelve SOLO HTML válido para un editor rich-text (sin <html>, <head> ni <body>).
- Usa <h2> para secciones, <h3> para subsecciones, <p>, <ul><li>, <ol><li>, <strong>. Sin estilos inline, scripts ni imágenes.
- Estructura esperada (alineada a ISO 27002): Objetivo del control, Alcance, Lineamientos de implementación (basados en la orientación ISO 27002), Responsabilidades, Evidencias esperadas, Referencias (cita el código del control y la sección ISO 27002).
- Fundamenta los lineamientos en la guía ISO 27002 provista; no inventes requisitos ajenos a la norma.
- Adapta al contexto de la organización (sector, alcance). Deja [COMPLETAR: ...] donde la organización deba precisar datos propios.
- Español formal de Perú."""

USER = """GUÍA ISO/IEC 27002:2022 PARA EL CONTROL:
{guia}

CONTROL DEL ANEXO A A DOCUMENTAR:
- Código: {codigo}
- Nombre: {nombre}
- Descripción: {descripcion}

CONTEXTO DE LA ORGANIZACIÓN:
{contexto}

Genera el documento de implementación del control en HTML."""


async def generate_control_document(req: ControlDocumentRequest) -> DocumentTemplateResponse:
    iso_count = await db.count_global_chunks(_FUENTE_ISO_27002)
    chunks: list[dict] = []
    if iso_count > 0:
        c = req.control
        query = f"{c.codigo} {c.nombre}. {c.descripcion}".strip()
        emb = get_embeddings()
        qv = await emb.aembed_query(query)
        chunks = await db.search_global(qv, k=6, fuentes=[_FUENTE_ISO_27002])

    guia = (
        "(Guía ISO 27002 no ingestada — redacta con conocimiento general de la norma.)"
        if not chunks
        else "\n\n".join(
            f"[{i + 1}] {(c['seccion'] + ' — ') if c.get('seccion') else ''}{c['chunk_texto']}"
            for i, c in enumerate(chunks)
        )
    )

    org = req.organizacion
    contexto = (
        f"Organización: {org.nombre_organizacion} | Sector: {org.sector} | "
        f"Colaboradores: {org.numero_colaboradores}\n"
        f"Misión: {org.mision}\n"
        f"Alcance del SGSI: {req.alcance_sgsi or '[no definido aún]'}"
    )

    prompt = ChatPromptTemplate.from_messages([("system", SYSTEM), ("user", USER)])
    model = get_chat_model()
    messages = await prompt.aformat_messages(
        guia=guia, codigo=req.control.codigo, nombre=req.control.nombre,
        descripcion=req.control.descripcion or "(sin descripción)", contexto=contexto,
    )
    ai_msg = await model.ainvoke(messages)
    html = (ai_msg.content if isinstance(ai_msg.content, str) else str(ai_msg.content)).strip()

    usage_meta = getattr(ai_msg, "usage_metadata", None) or {}
    usage = Usage(input=usage_meta.get("input_tokens", 0), output=usage_meta.get("output_tokens", 0))
    citas = [
        Cita(seccion=c.get("seccion"), documento=c["documento"], score=round(float(c["score"]), 3))
        for c in chunks
    ]
    return DocumentTemplateResponse(contenido_html=html, citas=citas, usage=usage, iso_disponible=iso_count > 0)
