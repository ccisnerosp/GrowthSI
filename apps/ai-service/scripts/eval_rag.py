"""Harness de evaluación LIGERO del pipeline RAG de GrowthSI.

Dos partes independientes:

  PARTE A — Calidad RAG (offline, usa el gold set scripts/eval/golden.json):
    Por cada consulta: recupera de vector_global → métricas de recuperación
    (recall@k, precision@k, MRR, score top vía anclajes del gold) → genera una
    respuesta acotada al contexto → un juez LLM puntúa faithfulness y answer
    relevance (estilo RAGAS). Agrega y reporta.

  PARTE B — Operación/negocio (SQL de solo lectura sobre Postgres):
    Tasa de aceptación de sugerencias IA (escenarios/controles), tokens y coste
    por operación (ia_uso), cobertura por dominio y frescura del índice.

Uso:
  python scripts/eval_rag.py                 # todo (A + B); A hace llamadas LLM
  python scripts/eval_rag.py --no-llm        # A solo recuperación (sin generar/juez)
  python scripts/eval_rag.py --ops-only      # solo B (cero LLM, cero embeddings)
  python scripts/eval_rag.py --rag-only      # solo A
  python scripts/eval_rag.py --limit 6 --k 5 # acota nº de casos y top-k

Escribe un reporte en scripts/eval/report.md y resume en consola.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg  # noqa: E402

from app import db  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.llm import get_embeddings, get_chat_model  # noqa: E402
from app.chains.risk_suggester import suggest_risks, _build_context  # noqa: E402
from app.schemas import (  # noqa: E402
    RiskSuggestRequest, OrgIn, ActivoIn, ActivoProcesoIn, ProcesoIn, SedeIn,
    FactorIn, ParteIn, CriteriosIn,
)

# La consola de Windows (cp1252) no soporta '→', '—', etc. → fuerza UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

EVAL_DIR = os.path.dirname(os.path.abspath(__file__)) + "/eval"
GOLDEN_PATH = EVAL_DIR + "/golden.json"
REPORT_PATH = EVAL_DIR + "/report.md"


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", (t or "")).strip().lower()


# ── PARTE A — Calidad RAG ─────────────────────────────────────────────────
GEN_SYSTEM = (
    "Responde la pregunta USANDO ÚNICAMENTE el CONTEXTO provisto. Si el contexto "
    "no contiene la respuesta, dilo explícitamente. Máximo 4 frases, español formal."
)
JUDGE_SYSTEM = (
    "Eres un evaluador estricto de sistemas RAG. Dado un CONTEXTO, una PREGUNTA y "
    "una RESPUESTA, evalúa:\n"
    "- faithfulness (0..1): 1 si TODA afirmación de la respuesta está respaldada por "
    "el contexto; baja si hay datos no presentes en el contexto.\n"
    "- answer_relevance (0..1): 1 si la respuesta atiende la pregunta.\n"
    'Responde SOLO JSON: {"faithfulness": <float>, "answer_relevance": <float>, "motivo": "<breve>"}'
)


def _hits(chunks: list[dict], expect_any: list[str]) -> list[bool]:
    exps = [e.lower() for e in expect_any]
    out = []
    for c in chunks:
        blob = _norm((c.get("seccion") or "") + " " + (c.get("chunk_texto") or ""))
        out.append(any(e in blob for e in exps))
    return out


def _retrieval_metrics(hits: list[bool]) -> dict:
    k = len(hits)
    n_hit = sum(1 for h in hits if h)
    mrr = 0.0
    for i, h in enumerate(hits):
        if h:
            mrr = 1.0 / (i + 1)
            break
    return {
        "recall_at_k": 1.0 if n_hit > 0 else 0.0,  # ¿algún chunk relevante en top-k?
        "precision_at_k": (n_hit / k) if k else 0.0,
        "mrr": mrr,
    }


def _parse_judge(content: str) -> dict:
    txt = re.sub(r"^```(?:json)?|```$", "", content.strip()).strip()
    try:
        d = json.loads(txt)
        return {
            "faithfulness": float(d.get("faithfulness", 0.0)),
            "answer_relevance": float(d.get("answer_relevance", 0.0)),
            "motivo": str(d.get("motivo", ""))[:200],
        }
    except (json.JSONDecodeError, ValueError, TypeError):
        return {"faithfulness": 0.0, "answer_relevance": 0.0, "motivo": "juez no parseable"}


async def eval_rag(limit: int, k: int, use_llm: bool, weak_threshold: float) -> dict:
    with open(GOLDEN_PATH, encoding="utf-8") as f:
        casos = json.load(f)["casos"]
    if limit:
        casos = casos[:limit]

    emb = get_embeddings()
    model = get_chat_model()
    judge = get_chat_model().bind(response_format={"type": "json_object"})

    # Avisa de fuentes no ingestadas (recall saldría 0 falsamente).
    fuentes = {fz for c in casos for fz in c["fuentes"]}
    faltantes = [fz for fz in fuentes if (await db.count_global_chunks(fz)) == 0]

    filas = []
    for c in casos:
        qv = await emb.aembed_query(c["query"])
        chunks = await db.search_global(qv, k=k, fuentes=c["fuentes"])
        hits = _hits(chunks, c["expect_any"])
        m = _retrieval_metrics(hits)
        top_score = round(float(chunks[0]["score"]), 3) if chunks else 0.0
        fila = {
            "id": c["id"], "query": c["query"], "fuentes": c["fuentes"],
            "recuperados": len(chunks), "top_score": top_score,
            "grounding_debil": top_score < weak_threshold,
            **m, "faithfulness": None, "answer_relevance": None,
        }

        if use_llm and chunks:
            ctx = "\n\n".join(f"[{i+1}] {ch.get('seccion') or ''} {ch['chunk_texto']}" for i, ch in enumerate(chunks))
            gen = await model.ainvoke([
                ("system", GEN_SYSTEM),
                ("user", f"CONTEXTO:\n{ctx}\n\nPREGUNTA: {c['query']}"),
            ])
            respuesta = gen.content if isinstance(gen.content, str) else str(gen.content)
            jr = await judge.ainvoke([
                ("system", JUDGE_SYSTEM),
                ("user", f"CONTEXTO:\n{ctx}\n\nPREGUNTA: {c['query']}\n\nRESPUESTA: {respuesta}"),
            ])
            verdict = _parse_judge(jr.content if isinstance(jr.content, str) else str(jr.content))
            fila["faithfulness"] = round(verdict["faithfulness"], 2)
            fila["answer_relevance"] = round(verdict["answer_relevance"], 2)
        filas.append(fila)

    n = len(filas) or 1
    agg = {
        "casos": len(filas),
        "fuentes_no_ingestadas": faltantes,
        "recall_at_k": round(sum(f["recall_at_k"] for f in filas) / n, 3),
        "precision_at_k": round(sum(f["precision_at_k"] for f in filas) / n, 3),
        "mrr": round(sum(f["mrr"] for f in filas) / n, 3),
        "score_top_medio": round(sum(f["top_score"] for f in filas) / n, 3),
        "grounding_debil_pct": round(100 * sum(1 for f in filas if f["grounding_debil"]) / n, 1),
    }
    juzgados = [f for f in filas if f["faithfulness"] is not None]
    if juzgados:
        agg["faithfulness_medio"] = round(sum(f["faithfulness"] for f in juzgados) / len(juzgados), 3)
        agg["answer_relevance_medio"] = round(sum(f["answer_relevance"] for f in juzgados) / len(juzgados), 3)
    return {"agg": agg, "filas": filas}


# ── PARTE C — Sugeridor de riesgos: anti-alucinación sobre fixture conocida ─
# PYME sintética con activos/tecnología/procesos/sedes EXPLÍCITOS. Como sabemos
# exactamente qué hay en el contexto, el juez puede detectar cualquier dato
# específico inventado (software, hardware, versión, fabricante, rol, proceso, sede).
def _fixture_pyme() -> RiskSuggestRequest:
    return RiskSuggestRequest(
        organizacion=OrgIn(
            nombre_organizacion="Comercializadora Andina SAC", sector="Comercio minorista",
            numero_colaboradores=45, mision="Vender productos de consumo en línea y tiendas físicas.",
            vision="Ser el referente regional de retail omnicanal.", estado_sgsi="en_implementacion",
        ),
        sedes=[SedeIn(codigo="SED-001", nombre_sede="Sede Lima", distrito_sede="Miraflores", departamento_sede="Lima", pais_sede="Perú")],
        procesos=[
            ProcesoIn(codigo="PRC-001", nombre="Ventas en línea", tipo="misional", area="Comercial", criticidad="alta", descripcion="Venta por el sitio web."),
            ProcesoIn(codigo="PRC-002", nombre="Gestión de clientes", tipo="apoyo", area="Comercial", criticidad="media", descripcion="Registro y atención de clientes."),
        ],
        activos=[
            ActivoIn(codigo="ACT-001", nombre="Sitio web de ventas", tipo="Software", clasificacion="Confidencial",
                     valoracion="alta", ubicacion="Nube", confidencialidad="alta", integridad="alta", disponibilidad="alta",
                     procesos=[ActivoProcesoIn(nombre="Ventas en línea", criticidad="alta", relacion="soporta")],
                     exposicion="externa", modelo="WordPress", version="6.2", proveedor="Automattic"),
            ActivoIn(codigo="ACT-002", nombre="Servidor de aplicaciones", tipo="Software", clasificacion="Interno",
                     valoracion="alta", ubicacion="Sede Lima", confidencialidad="media", integridad="alta", disponibilidad="alta",
                     procesos=[ActivoProcesoIn(nombre="Ventas en línea", criticidad="alta", relacion="soporta")],
                     exposicion="interna", modelo="Windows Server", version="2019", proveedor="Microsoft"),
            ActivoIn(codigo="ACT-003", nombre="Base de datos de clientes", tipo="Datos", clasificacion="Confidencial",
                     valoracion="alta", ubicacion="Sede Lima", confidencialidad="alta", integridad="alta", disponibilidad="media",
                     procesos=[ActivoProcesoIn(nombre="Gestión de clientes", criticidad="media", relacion="soporta")], exposicion="interna"),
            ActivoIn(codigo="ACT-004", nombre="Laptops del personal", tipo="Hardware", clasificacion="Interno",
                     valoracion="media", ubicacion="Sede Lima", confidencialidad="media", integridad="media", disponibilidad="media", exposicion="interna"),
        ],
        factores=[FactorIn(codigo="FAC-001", origen="externo", categoria="tecnológico", tipo="amenaza", descripcion="Aumento de ataques a comercios electrónicos.", impacto="alto")],
        partes=[ParteIn(codigo="PAR-001", nombre="Clientes", tipo="externa", expectativas="Protección de sus datos personales.", relevancia="alta")],
        alcance_sgsi="Procesos de ventas en línea y gestión de clientes en la Sede Lima.",
        criterios=CriteriosIn(max_prob=5, max_impact=5),
        dominios=["tecnologico", "personas"], por_dominio=2,
    )


RISK_JUDGE_SYSTEM = (
    "Eres un auditor que detecta ALUCINACIONES en una sugerencia de riesgo para una PYME. "
    "Recibes el CONTEXTO (lo único que el sistema entregó al modelo) y un ESCENARIO generado. "
    "Marca como NO fundamentado cualquier dato ESPECÍFICO de la organización afirmado en el escenario que NO aparezca en el contexto: "
    "software, hardware, versiones, fabricantes, sistemas concretos, roles/cargos, procesos o sedes. "
    "Las amenazas/técnicas genéricas del sector (phishing, ransomware, etc.) NO cuentan como invención. "
    'Responde SOLO JSON: {"faithfulness": <0..1>, "inventa_especificos": <true|false>, "inventados": ["..."], "motivo": "<breve>"}'
)


def _parse_risk_judge(content: str) -> dict:
    txt = re.sub(r"^```(?:json)?|```$", "", content.strip()).strip()
    try:
        d = json.loads(txt)
        return {
            "faithfulness": float(d.get("faithfulness", 0.0)),
            "inventa": bool(d.get("inventa_especificos", False)),
            "inventados": [str(x)[:60] for x in (d.get("inventados") or [])][:8],
            "motivo": str(d.get("motivo", ""))[:200],
        }
    except (json.JSONDecodeError, ValueError, TypeError):
        return {"faithfulness": 0.0, "inventa": True, "inventados": [], "motivo": "juez no parseable"}


async def eval_risk_suggester() -> dict:
    req = _fixture_pyme()
    contexto = _build_context(req)  # exactamente lo que el chain le pasó al modelo
    resp = await suggest_risks(req)
    judge = get_chat_model().bind(response_format={"type": "json_object"})

    filas = []
    for sc in resp.escenarios:
        escenario_txt = (
            f"NOMBRE: {sc.nombre}\nDESCRIPCIÓN: {sc.descripcion}\nAMENAZA: {sc.amenaza}\n"
            f"VULNERABILIDAD: {sc.vulnerabilidad}\nJUSTIFICACIÓN: {sc.justificacion}\nFUENTE: {sc.fuente_referencia}"
        )
        jr = await judge.ainvoke([
            ("system", RISK_JUDGE_SYSTEM),
            ("user", f"CONTEXTO DE LA ORGANIZACIÓN:\n{contexto}\n\nESCENARIO GENERADO:\n{escenario_txt}"),
        ])
        v = _parse_risk_judge(jr.content if isinstance(jr.content, str) else str(jr.content))
        filas.append({"dominio": sc.dominio, "nombre": sc.nombre, **v})

    n = len(filas) or 1
    agg = {
        "escenarios": len(filas),
        "faithfulness_medio": round(sum(f["faithfulness"] for f in filas) / n, 3),
        "con_invencion": sum(1 for f in filas if f["inventa"]),
        "con_invencion_pct": round(100 * sum(1 for f in filas if f["inventa"]) / n, 1),
        "omitidos_similares": resp.omitidos_similares,
        "cve_descartados": resp.cve_descartados,
        "nvd_consultado": resp.nvd_consultado,
        "cve_encontrados": resp.cve_encontrados,
    }
    return {"agg": agg, "filas": filas}


# ── PARTE B — Operación / negocio (SQL de solo lectura) ───────────────────
async def eval_ops() -> dict:
    s = get_settings()
    conn = await asyncpg.connect(dsn=s.database_url)
    try:
        esc = await conn.fetchrow(
            "SELECT count(*) FILTER (WHERE origen='ia') AS ia, "
            "count(*) FILTER (WHERE origen='ia' AND estado<>'generado') AS revisados "
            "FROM escenario_riesgo WHERE deleted_at IS NULL"
        )
        ctr = await conn.fetchrow(
            "SELECT count(*) FILTER (WHERE origen='ia') AS ia, "
            "count(*) FILTER (WHERE origen='ia' AND estado<>'generado') AS revisados "
            "FROM control_soa"
        )
        uso = await conn.fetch(
            "SELECT operacion, count(*) AS llamadas, sum(tokens_input) AS t_in, "
            "sum(tokens_output) AS t_out, sum(costo_usd) AS costo "
            "FROM ia_uso GROUP BY operacion ORDER BY count(*) DESC"
        )
        doms = await conn.fetch(
            "SELECT coalesce(dominio,'(sin dominio)') AS dominio, count(*) AS n "
            "FROM escenario_riesgo WHERE deleted_at IS NULL GROUP BY dominio ORDER BY count(*) DESC"
        )
        idx = await conn.fetch(
            "SELECT fuente, count(*) AS chunks FROM vector_global GROUP BY fuente ORDER BY count(*) DESC"
        )
    finally:
        await conn.close()

    def tasa(r):
        ia = int(r["ia"] or 0); rev = int(r["revisados"] or 0)
        return {"ia_generados": ia, "revisados": rev, "tasa_aceptacion_pct": round(100 * rev / ia, 1) if ia else None}

    return {
        "aceptacion_escenarios": tasa(esc),
        "aceptacion_controles": tasa(ctr),
        "uso_ia": [{"operacion": r["operacion"], "llamadas": int(r["llamadas"]),
                    "tokens_in": int(r["t_in"] or 0), "tokens_out": int(r["t_out"] or 0),
                    "costo_usd": round(float(r["costo"] or 0), 4)} for r in uso],
        "cobertura_dominios": [{"dominio": r["dominio"], "n": int(r["n"])} for r in doms],
        "indice": [{"fuente": r["fuente"], "chunks": int(r["chunks"])} for r in idx],
    }


# ── Reporte ────────────────────────────────────────────────────────────────
def render_md(rag: dict | None, ops: dict | None, risk: dict | None, stamp: str) -> str:
    L = [f"# Evaluación RAG — GrowthSI", f"_Generado: {stamp}_", ""]
    if rag:
        a = rag["agg"]
        L += ["## Parte A — Calidad RAG", ""]
        if a["fuentes_no_ingestadas"]:
            L += [f"> ⚠️ Fuentes NO ingestadas (recall no fiable): `{', '.join(a['fuentes_no_ingestadas'])}`", ""]
        L += [
            "| Indicador | Valor |", "|---|---|",
            f"| Casos evaluados | {a['casos']} |",
            f"| Context Recall@k | {a['recall_at_k']} |",
            f"| Context Precision@k | {a['precision_at_k']} |",
            f"| MRR | {a['mrr']} |",
            f"| Score top medio (coseno) | {a['score_top_medio']} |",
            f"| Grounding débil (% casos) | {a['grounding_debil_pct']}% |",
        ]
        if "faithfulness_medio" in a:
            L += [f"| Faithfulness medio | {a['faithfulness_medio']} |",
                  f"| Answer relevance medio | {a['answer_relevance_medio']} |"]
        L += ["", "### Detalle por caso", "", "| Caso | Recall@k | Prec@k | MRR | TopScore | Faith | Relev |", "|---|---|---|---|---|---|---|"]
        for f in rag["filas"]:
            L.append(f"| {f['id']} | {f['recall_at_k']} | {round(f['precision_at_k'],2)} | {round(f['mrr'],2)} | {f['top_score']} | {f['faithfulness']} | {f['answer_relevance']} |")
        L.append("")
    if risk:
        a = risk["agg"]
        L += ["## Parte C — Sugeridor de riesgos (anti-alucinación, fixture PYME)", "",
              "| Indicador | Valor |", "|---|---|",
              f"| Escenarios generados | {a['escenarios']} |",
              f"| Faithfulness medio (grounding) | {a['faithfulness_medio']} |",
              f"| Escenarios con invención | {a['con_invencion']} ({a['con_invencion_pct']}%) |",
              f"| NVD consultada / CVE hallados | {a['nvd_consultado']} / {a['cve_encontrados']} |",
              f"| CVE descartados (guarda) | {a['cve_descartados']} |",
              f"| Omitidos por similitud | {a['omitidos_similares']} |",
              "", "### Detalle por escenario", "",
              "| Dominio | Escenario | Faith | ¿Inventa? | Datos inventados |", "|---|---|---|---|---|"]
        for f in risk["filas"]:
            inv = ", ".join(f["inventados"]) if f["inventados"] else "—"
            L.append(f"| {f['dominio']} | {f['nombre'][:42]} | {round(f['faithfulness'],2)} | {'SÍ' if f['inventa'] else 'no'} | {inv} |")
        L.append("")
    if ops:
        L += ["## Parte B — Operación / negocio", ""]
        ae, ac = ops["aceptacion_escenarios"], ops["aceptacion_controles"]
        L += [
            "| Indicador | Valor |", "|---|---|",
            f"| Aceptación escenarios IA | {ae['tasa_aceptacion_pct']}% ({ae['revisados']}/{ae['ia_generados']}) |",
            f"| Aceptación controles IA | {ac['tasa_aceptacion_pct']}% ({ac['revisados']}/{ac['ia_generados']}) |",
            "",
            "### Uso/coste por operación (ia_uso)", "", "| Operación | Llamadas | Tokens in | Tokens out | Costo USD |", "|---|---|---|---|---|",
        ]
        for u in ops["uso_ia"]:
            L.append(f"| {u['operacion']} | {u['llamadas']} | {u['tokens_in']} | {u['tokens_out']} | {u['costo_usd']} |")
        L += ["", "### Cobertura por dominio", "", "| Dominio | Escenarios |", "|---|---|"]
        for d in ops["cobertura_dominios"]:
            L.append(f"| {d['dominio']} | {d['n']} |")
        L += ["", "### Frescura del índice (vector_global)", "", "| Fuente | Chunks |", "|---|---|"]
        for i in ops["indice"]:
            L.append(f"| {i['fuente']} | {i['chunks']} |")
        L.append("")
    return "\n".join(L)


async def main() -> None:
    ap = argparse.ArgumentParser(description="Harness de evaluación RAG (ligero).")
    ap.add_argument("--limit", type=int, default=0, help="nº máx. de casos del gold set")
    ap.add_argument("--k", type=int, default=5, help="top-k de recuperación")
    ap.add_argument("--no-llm", action="store_true", help="A: solo recuperación (sin generar/juez); omite C")
    ap.add_argument("--ops-only", action="store_true", help="solo Parte B (cero LLM/embeddings)")
    ap.add_argument("--rag-only", action="store_true", help="solo Parte A")
    ap.add_argument("--risk-only", action="store_true", help="solo Parte C (sugeridor de riesgos)")
    # 0.50 calibrado al baseline observado (coseno 0.44–0.72 con text-embedding-3-small
    # sobre texto ISO). Ajústalo a tu corpus/modelo de embeddings.
    ap.add_argument("--threshold", type=float, default=0.50, help="umbral de grounding débil (coseno)")
    args = ap.parse_args()

    # Si se pide una parte concreta, solo esa; si no, las tres.
    solo = args.ops_only or args.rag_only or args.risk_only
    run_a = args.rag_only or (not solo)
    run_b = args.ops_only or (not solo)
    run_c = args.risk_only or (not solo)

    await db.init_pool()
    rag = ops = risk = None
    try:
        if run_a:
            rag = await eval_rag(args.limit, args.k, use_llm=not args.no_llm, weak_threshold=args.threshold)
        if run_c and not args.no_llm:
            risk = await eval_risk_suggester()
        if run_b:
            ops = await eval_ops()
    finally:
        await db.close_pool()

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    md = render_md(rag, ops, risk, stamp)
    os.makedirs(EVAL_DIR, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(md)

    print(md)
    print(f"\n→ Reporte escrito en {REPORT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
