"""Sugeridor de escenarios de riesgo — la función IA más importante del SGSI.

Sugiere escenarios de riesgo contextualizados a la organización, cubriendo los
4 dominios de ISO 27001:2022 (tecnológico, organizacional, personas, físico),
y propone una evaluación inicial (probabilidad, impacto) NO definitiva — debe
ser revisada y aprobada por el usuario (estado 'generado').

Arquitectura de fuentes (ambos patrones, obligatorios):
  · PATRÓN A — RAG offline sobre vector_global filtrando por las fuentes de
    cada dominio (MITRE ATT&CK, ISO 27005, ENISA). Sin llamadas externas.
  · PATRÓN B — NVD online, si el escenario incluye activos con tecnología
    identificada (basta producto o proveedor; la versión es opcional). El texto
    libre se normaliza a CPE con el LLM (app/cpe.py) y se consulta la NVD por
    CPE (preciso, consciente de versión) con respaldo por keyword. Aporta CVEs
    recientes (ventana y CVSS configurables; por defecto 180 días / CVSS>=4).

Flujo: retrieval por dominio (+NVD) → un único prompt → LLM → JSON de
escenarios → validación/clamp → respuesta.
"""

from __future__ import annotations

import json
import re

from langchain_core.prompts import ChatPromptTemplate

from app import cpe, db, nvd
from app.config import get_settings
from app.llm import get_chat_model, get_embeddings
from app.data.threat_catalog import FUENTES_POR_DOMINIO, DOMINIOS
from app.schemas import RiskSuggestRequest, RiskSuggestResponse, SuggestedScenario, Usage

_DOMINIO_LABEL = {
    "tecnologico": "TECNOLÓGICO",
    "organizacional": "ORGANIZACIONAL",
    "personas": "PERSONAS",
    "fisico": "FÍSICO",
}

_DOMINIO_QUERY = {
    "tecnologico": "amenazas y técnicas de ataque a sistemas, redes, aplicaciones y nube; vulnerabilidades técnicas, malware, ransomware, explotación de servicios",
    "organizacional": "amenazas organizacionales y de proceso, riesgo de terceros y proveedores, fuga de datos, continuidad del negocio, cumplimiento",
    "personas": "amenazas por factor humano, ingeniería social, phishing, abuso de credenciales, amenaza interna (insider threat)",
    "fisico": "amenazas físicas y ambientales, acceso físico no autorizado, robo de equipos, desastres naturales, fallos de suministro",
}

_TRATAMIENTOS = {"mitigar", "transferir", "aceptar", "evitar"}

SYSTEM = """Eres un analista experto en gestión de riesgos de seguridad de la información (ISO/IEC 27005:2022 e ISO/IEC 27001:2022) que asiste a una PYME.

Tu tarea: proponer ESCENARIOS DE RIESGO contextualizados a la organización, cubriendo los dominios solicitados (tecnológico, organizacional, personas, físico).

Insumos que recibes:
1. CONTEXTO de la organización (sector, procesos, activos, sedes, factores, alcance).
2. AMENAZAS POR DOMINIO — extractos de fuentes reconocidas (MITRE ATT&CK, ISO 27005, ENISA) y, si aplica, CVEs recientes de la NVD para las tecnologías de los activos.
3. ESCENARIOS YA CUBIERTOS — con su amenaza y vulnerabilidad. NO los repitas NI generes variantes del mismo riesgo con otra redacción; aporta ÁNGULOS NUEVOS (otra amenaza, otro activo, otro vector).

Reglas estrictas:
- No repitas un escenario ya cubierto aunque cambies su nombre: si la amenaza+vulnerabilidad coinciden en esencia con uno listado, NO lo generes.
- Cada escenario debe basarse en las amenazas provistas y ser plausible para ESTA organización (cita la técnica/amenaza/CVE en la justificación).
- Evalúa probabilidad e impacto como enteros dentro de las escalas indicadas. Es una evaluación PRELIMINAR, no definitiva.
- Propón un tratamiento: 'mitigar', 'transferir', 'aceptar' o 'evitar'.
- 'amenaza' = qué/quién explota; 'vulnerabilidad' = la debilidad explotada. Sé concreto.
- FUNDAMENTACIÓN (NO alucinar): usa ÚNICAMENTE datos presentes en el CONTEXTO. En concreto:
  · Software/hardware/tecnología: menciona solo productos, versiones o proveedores que aparezcan en los ACTIVOS. NO inventes tecnologías, sistemas ni fabricantes que la organización no declaró.
  · CVEs: cita un CVE SOLO si aparece textualmente en la lista "CVE RECIENTES (NVD)" provista. Si no se provee ningún CVE, NO cites ningún CVE (ni en 'justificacion' ni en 'fuente_referencia').
  · NO nombres procesos, sedes, áreas ni roles/cargos que no aparezcan en el contexto.
  · Si te falta el detalle específico (p. ej. la tecnología exacta de un activo), describe el escenario de forma genérica al sector en lugar de inventar datos concretos de la organización.
- Español formal de Perú.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown, con esta forma:
{{"escenarios": [{{"dominio": "tecnologico|organizacional|personas|fisico", "nombre": "...", "descripcion": "...", "amenaza": "...", "vulnerabilidad": "...", "probabilidad": <int>, "impacto": <int>, "tratamiento_sugerido": "mitigar", "justificacion": "...", "fuente_referencia": "MITRE T1486 / ISO 27005 / ENISA / CVE-XXXX"}}]}}"""

USER = """CONTEXTO DE LA ORGANIZACIÓN:
{contexto}

ESCALAS DE EVALUACIÓN: probabilidad 1-{max_prob}, impacto 1-{max_impact}.

AMENAZAS POR DOMINIO (fundamento para los escenarios):
{amenazas}

ESCENARIOS YA CUBIERTOS (no repetir ni reformular; busca ángulos nuevos):
{existentes}

Genera exactamente {por_dominio} escenario(s) por cada uno de estos dominios: {dominios}.
Devuelve solo el JSON."""


def _activo_line(a) -> str:
    """Línea de contexto de un activo, con tríada CIA, ubicación, tecnología y
    procesos críticos que sostiene (todo lo que fundamenta probabilidad/impacto)."""
    parts = [f"  · {a.nombre} ({a.tipo}, clasif. {a.clasificacion}, valoración {a.valoracion})"]
    cid = [f"{k}={v}" for k, v in (("C", a.confidencialidad), ("I", a.integridad), ("D", a.disponibilidad)) if v]
    if cid:
        parts.append(" [CIA " + ", ".join(cid) + "]")
    if a.ubicacion:
        parts.append(f" — ubicación: {a.ubicacion}")
    if a.exposicion:
        parts.append(f" — exposición: {a.exposicion}")
    if a.modelo or a.version:
        tech = " ".join(x for x in (a.modelo, a.version) if x)
        prov = f" [{a.proveedor}]" if a.proveedor else ""
        parts.append(f" — tecnología: {tech}{prov}")
    line = "".join(parts)
    if a.procesos:
        procs = "; ".join(
            f"{p.nombre}" + (f" (criticidad {p.criticidad})" if p.criticidad else "")
            for p in a.procesos
        )
        line += f"\n      sostiene procesos: {procs}"
    return line


def _sede_line(s) -> str:
    loc = ", ".join(x for x in (s.distrito_sede, s.departamento_sede, s.pais_sede) if x)
    return f"  · {s.nombre_sede}" + (f" — {loc}" if loc else "")


def _existente_line(e) -> str:
    """Línea de un escenario ya cubierto, con amenaza/vulnerabilidad para que el
    modelo distinga el riesgo de fondo (no solo el nombre) y evite reformularlo."""
    base = f"  · [{e.dominio or 's/d'}] {e.nombre}"
    det = []
    if e.amenaza:
        det.append(f"amenaza: {e.amenaza}")
    if e.vulnerabilidad:
        det.append(f"vuln: {e.vulnerabilidad}")
    if det:
        base += " — " + "; ".join(det)
    if e.estado:
        base += f" (estado: {e.estado})"
    return base


def _texto_dedup(nombre: str, amenaza: str, vulnerabilidad: str) -> str:
    """Texto canónico de un escenario para comparación semántica."""
    return ". ".join(p for p in (nombre, amenaza, vulnerabilidad) if p).strip()


_CVE_RE = re.compile(r"CVE-\d{4}-\d{4,}", re.IGNORECASE)


def _limpia_separadores(txt: str) -> str:
    """Limpia separadores colgantes tras quitar una cita (p. ej. 'MITRE / ' → 'MITRE',
    'tambien .' → 'tambien.')."""
    txt = re.sub(r"\s*/\s*/\s*", " / ", txt)
    txt = re.sub(r"\s+([.,;:])", r"\1", txt)   # espacio colgante antes de puntuación
    txt = re.sub(r"\(\s*\)", "", txt)          # paréntesis vacíos '()'
    txt = re.sub(r"^[\s/;,]+|[\s/;,]+$", "", txt)
    return re.sub(r"\s{2,}", " ", txt).strip()


def _strip_cves_no_fundamentados(escenarios, cves) -> tuple[list, int]:
    """Elimina de la salida toda cita CVE que NO esté en la lista NVD provista
    (consultada en vivo en esta misma petición). Si no se consultó NVD, 'allowed'
    queda vacío y se quitan TODAS las citas CVE. Determinista (regex), auditable."""
    allowed = {c["cve_id"].upper() for c in cves if c.get("cve_id")}
    descartados = 0
    for s in escenarios:
        for campo in ("fuente_referencia", "justificacion"):
            val = getattr(s, campo)
            citados = _CVE_RE.findall(val)
            no_fund = [m for m in citados if m.upper() not in allowed]
            if not no_fund:
                continue
            descartados += len(no_fund)
            for m in no_fund:
                val = val.replace(m, "")
            setattr(s, campo, _limpia_separadores(val))
    return escenarios, descartados


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


# Umbral de similitud (coseno) por encima del cual un escenario generado se
# considera duplicado de uno existente o de otro del mismo lote. Calibrado para
# cazar reformulaciones del mismo riesgo sin descartar riesgos genuinamente distintos.
_SIM_THRESHOLD = 0.85


def _build_context(req: RiskSuggestRequest) -> str:
    o = req.organizacion
    lines = [
        f"ORGANIZACIÓN: {o.nombre_organizacion} | Sector: {o.sector} | Colaboradores: {o.numero_colaboradores}",
        f"MISIÓN: {o.mision}",
        f"ALCANCE DEL SGSI: {req.alcance_sgsi or '[no definido aún]'}",
        "",
        f"PROCESOS ({len(req.procesos)}):",
        *[f"  · {p.nombre} ({p.tipo}, área {p.area}, criticidad {p.criticidad})" for p in req.procesos],
        "",
        f"ACTIVOS DE INFORMACIÓN ({len(req.activos)}):",
        *[_activo_line(a) for a in req.activos],
        "",
        f"SEDES ({len(req.sedes)}):",
        *[_sede_line(s) for s in req.sedes],
        "",
        f"FACTORES I/E ({len(req.factores)}):",
        *[f"  · [{f.origen}/{f.categoria}/{f.tipo}, impacto {f.impacto}] {f.descripcion}" for f in req.factores],
        "",
        f"PARTES INTERESADAS ({len(req.partes)}):",
        *[f"  · {p.nombre} ({p.tipo}, relevancia {p.relevancia}): {p.expectativas}" for p in req.partes],
    ]
    return "\n".join(lines)


# Prioridad de exposición para repartir el presupuesto (limitado) de la NVD:
# los activos alcanzables desde internet son los más relevantes para CVE.
_EXPOSICION_PRIORIDAD = {"externa": 0, "nube": 1, "interna": 3}


def _tech_assets_raw(req: RiskSuggestRequest) -> list[dict]:
    """Activos con tecnología identificada → insumo crudo para la normalización CPE.

    Gate RELAJADO (Capa 1, pensado para PYME): basta con que el activo tenga
    PRODUCTO (modelo) o PROVEEDOR — la versión es opcional. Antes se exigía
    modelo Y versión, lo que dejaba fuera a la mayoría de los activos de una PYME
    (que rara vez conoce la versión exacta). La normalización (Capa 2) y la
    consulta por CPE se encargan de la precisión. La exposición GOBIERNA la
    prioridad: los activos 'externa'/'nube' van primero cuando la NVD limita el
    nº de consultas; los internos siguen cubiertos, con menor prioridad."""
    raw: list[dict] = []
    for a in req.activos:
        modelo = (a.modelo or "").strip()
        proveedor = (a.proveedor or "").strip()
        if modelo or proveedor:
            prio = _EXPOSICION_PRIORIDAD.get((a.exposicion or "").strip().lower(), 2)
            raw.append({
                "proveedor": proveedor,
                "modelo": modelo,
                "version": (a.version or "").strip(),
                "prioridad": prio,
            })
    raw.sort(key=lambda r: r["prioridad"])
    return raw


def _balanced_object(txt: str) -> str | None:
    """Extrae el primer objeto JSON balanceado por llaves (ignora basura final
    como un '}' de más que rompe json.loads). Respeta llaves dentro de strings."""
    start = txt.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(txt)):
        ch = txt[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return txt[start : i + 1]
    return None


def _parse_json(content: str) -> dict:
    """Parsea el JSON del LLM tolerando fences de markdown / texto alrededor.

    El LLM ocasionalmente añade una llave de más al final; usar JSON mode lo
    evita, pero como defensa extra extraemos el primer objeto balanceado."""
    txt = content.strip()
    txt = re.sub(r"^```(?:json)?", "", txt).strip()
    txt = re.sub(r"```$", "", txt).strip()
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        balanced = _balanced_object(txt)
        if balanced:
            try:
                return json.loads(balanced)
            except json.JSONDecodeError:
                return {}
        return {}


def _clamp(v, lo: int, hi: int, default: int) -> int:
    try:
        n = int(round(float(v)))
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, n))


async def suggest_risks(req: RiskSuggestRequest) -> RiskSuggestResponse:
    dominios = [d for d in req.dominios if d in DOMINIOS] or DOMINIOS
    emb = get_embeddings()

    # ── PATRÓN A — retrieval offline por dominio ─────────────────────────
    fuentes_disponibles: dict[str, bool] = {}
    bloques: list[str] = []
    for dom in dominios:
        fuentes = FUENTES_POR_DOMINIO.get(dom, [])
        total = 0
        for f in fuentes:
            total += await db.count_global_chunks(f)
        fuentes_disponibles[dom] = total > 0

        bloque = [f"=== DOMINIO {_DOMINIO_LABEL.get(dom, dom.upper())} ==="]
        if total > 0:
            q = f"{_DOMINIO_QUERY.get(dom, dom)}. Sector: {req.organizacion.sector}."
            qv = await emb.aembed_query(q)
            chunks = await db.search_global(qv, k=5, fuentes=fuentes)
            for i, c in enumerate(chunks):
                ref = (c.get("seccion") + " — ") if c.get("seccion") else ""
                cuerpo = re.sub(r"\s+", " ", c["chunk_texto"]).strip()
                bloque.append(f"[{i + 1}] {ref}{cuerpo}")
        else:
            bloque.append("(Sin material offline ingestado para este dominio — usa conocimiento general de ISO 27005.)")
        bloques.append("\n".join(bloque))

    # ── PATRÓN B — NVD online (solo si hay tecnología y dominio tecnológico) ─
    nvd_consultado = False
    cves = []
    if "tecnologico" in dominios:
        raw_assets = _tech_assets_raw(req)
        if raw_assets:
            nvd_consultado = True
            # Capa 2: normaliza el texto libre del activo a CPE (o keyword limpia)
            # antes de consultar. Degrada solo a keyword si el LLM no reconoce.
            targets = await cpe.normalize_targets(raw_assets)
            cves = await nvd.fetch_recent_cves(targets)
            if cves:
                _s = get_settings()
                _dias = min(_s.nvd_lookback_days, 120)
                cve_lines = ["", f"CVE RECIENTES (NVD, últimos {_dias} días, CVSS≥{_s.nvd_min_cvss:g}) para tus tecnologías:"]
                for c in cves:
                    cve_lines.append(
                        f"  · {c['cve_id']} (CVSS {c['cvss']}, {c['severidad']}) [{c['tecnologia']}]: {c['descripcion']}"
                    )
                # añade los CVE al bloque tecnológico
                for idx, b in enumerate(bloques):
                    if b.startswith("=== DOMINIO TECNOLÓGICO"):
                        bloques[idx] = b + "\n" + "\n".join(cve_lines)
                        break

    amenazas_txt = "\n\n".join(bloques)
    existentes_txt = "\n".join(_existente_line(e) for e in req.escenarios_existentes) or "  (ninguno)"

    # ── Prompt → LLM → JSON ──────────────────────────────────────────────
    prompt = ChatPromptTemplate.from_messages([("system", SYSTEM), ("user", USER)])
    # JSON mode: el modelo queda obligado a devolver JSON válido (evita la llave
    # de más que a veces rompe el parseo). El prompt ya pide JSON explícitamente.
    model = get_chat_model().bind(response_format={"type": "json_object"})
    messages = await prompt.aformat_messages(
        contexto=_build_context(req),
        max_prob=req.criterios.max_prob,
        max_impact=req.criterios.max_impact,
        amenazas=amenazas_txt,
        existentes=existentes_txt,
        por_dominio=req.por_dominio,
        dominios=", ".join(dominios),
    )
    ai_msg = await model.ainvoke(messages)
    content = ai_msg.content if isinstance(ai_msg.content, str) else str(ai_msg.content)

    parsed = _parse_json(content)
    raw_scen = parsed.get("escenarios", []) if isinstance(parsed, dict) else []

    escenarios: list[SuggestedScenario] = []
    for r in raw_scen:
        if not isinstance(r, dict):
            continue
        dom = str(r.get("dominio", "")).strip().lower()
        if dom not in DOMINIOS:
            continue
        nombre = str(r.get("nombre", "")).strip()
        if not nombre:
            continue
        trat = str(r.get("tratamiento_sugerido", "mitigar")).strip().lower()
        if trat not in _TRATAMIENTOS:
            trat = "mitigar"
        escenarios.append(SuggestedScenario(
            dominio=dom,
            nombre=nombre[:200],
            descripcion=str(r.get("descripcion", "")).strip(),
            amenaza=str(r.get("amenaza", "")).strip()[:180],
            vulnerabilidad=str(r.get("vulnerabilidad", "")).strip()[:180],
            probabilidad=_clamp(r.get("probabilidad"), 1, req.criterios.max_prob, max(1, req.criterios.max_prob // 2)),
            impacto=_clamp(r.get("impacto"), 1, req.criterios.max_impact, max(1, req.criterios.max_impact // 2)),
            tratamiento_sugerido=trat,
            justificacion=str(r.get("justificacion", "")).strip(),
            fuente_referencia=str(r.get("fuente_referencia", "")).strip()[:200],
        ))

    usage_meta = getattr(ai_msg, "usage_metadata", None) or {}
    usage = Usage(input=usage_meta.get("input_tokens", 0), output=usage_meta.get("output_tokens", 0))

    # ── Guarda semántica (B): descarta variantes re-redactadas ────────────
    # Compara cada escenario generado (por embeddings) contra los existentes y
    # contra los ya aceptados de este mismo lote; descarta los muy similares.
    # Defensa de salida: la instrucción del prompt es blanda; esto la hace dura.
    escenarios, omitidos = await _filtrar_similares(escenarios, req.escenarios_existentes, emb)

    # ── Guarda de CVE (anti-alucinación): elimina citas CVE no provistas por NVD.
    escenarios, cve_descartados = _strip_cves_no_fundamentados(escenarios, cves)

    return RiskSuggestResponse(
        escenarios=escenarios,
        fuentes_disponibles=fuentes_disponibles,
        nvd_consultado=nvd_consultado,
        cve_encontrados=len(cves),
        omitidos_similares=omitidos,
        cve_descartados=cve_descartados,
        usage=usage,
    )


async def _filtrar_similares(generados, existentes, emb):
    """Devuelve (escenarios_conservados, n_omitidos). Si los embeddings fallan,
    no rompe la generación: devuelve todo sin filtrar."""
    if not generados:
        return generados, 0
    try:
        gen_text = [_texto_dedup(s.nombre, s.amenaza, s.vulnerabilidad) for s in generados]
        ex_text = [_texto_dedup(e.nombre, e.amenaza, e.vulnerabilidad) for e in existentes]
        gen_vecs = await emb.aembed_documents(gen_text)
        ex_vecs = await emb.aembed_documents(ex_text) if ex_text else []
    except Exception:
        return generados, 0

    conservados = []
    conservados_vecs: list[list[float]] = []
    omitidos = 0
    for s, v in zip(generados, gen_vecs):
        ref = ex_vecs + conservados_vecs
        if any(_cosine(v, r) >= _SIM_THRESHOLD for r in ref):
            omitidos += 1
            continue
        conservados.append(s)
        conservados_vecs.append(v)
    return conservados, omitidos
