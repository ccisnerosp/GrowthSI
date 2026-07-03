"""PATRÓN B — Consulta ONLINE a la NVD (NIST National Vulnerability Database).

Se consulta en tiempo real cuando el escenario incluye activos con tecnología
identificada. Busca CVEs recientes (ventana y piso de CVSS configurables, por
defecto 180 días / CVSS>=4 para una PYME) de esas tecnologías.

Dos modos de consulta por tecnología (decididos por el llamador):
  · CPE  (preferido, Capa 2): `virtualMatchString` con el CPE oficial
    (cpe:2.3:part:vendor:product[:version]). Es preciso y CONSCIENTE DE VERSIÓN
    (la NVD resuelve los rangos versionStart/End del CVE). No depende de que la
    versión aparezca textual en la descripción.
  · KEYWORD (respaldo, Capa 1): `keywordSearch` con el nombre limpio del
    producto (sin proveedor de hosting ni número de versión). Más laxo: la
    versión NO se exige como término — solo se usa para rankear resultados.

Degrada con elegancia: si la NVD falla, hay timeout o rate-limit, devuelve lo
que haya conseguido (o lista vacía). El sugeridor sigue con las fuentes offline.

API: https://services.nvd.nist.gov/rest/json/cves/2.0
Sin API key funciona con rate-limit bajo; con NVD_API_KEY el límite sube.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

import httpx

from app.config import get_settings

_NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
_MAX_TARGETS = 3          # limita requests para no agotar el rate-limit
_RESULTS_PER_PAGE = 20
_MAX_CVES = 12            # tope de CVEs devueltos al sugeridor
_MAX_LOOKBACK_DAYS = 120  # la NVD rechaza (404) rangos de fechas > 120 días

_VERSION_RE = re.compile(r"^v?\d+(\.\d+)*$")


class TechTarget(TypedDict):
    """Tecnología de un activo, ya normalizada y lista para consultar la NVD."""
    label: str            # etiqueta legible (lo que el usuario describió)
    cpe: str | None       # 'cpe:2.3:a:vendor:product' (sin versión) o None
    version: str | None   # versión identificada (para CPE y/o ranking)
    keyword: str          # respaldo: nombre limpio del producto
    prioridad: int        # menor = más expuesto a internet (gana presupuesto NVD)


class CveItem(TypedDict):
    cve_id: str
    descripcion: str
    cvss: float
    severidad: str
    tecnologia: str
    version_match: bool   # la versión del activo aparece en la descripción


def _best_cvss(metrics: dict[str, Any]) -> tuple[float, str]:
    """Devuelve (baseScore, baseSeverity) priorizando CVSS v3.1 > v3.0 > v2."""
    for key in ("cvssMetricV31", "cvssMetricV30"):
        arr = metrics.get(key) or []
        if arr:
            data = arr[0].get("cvssData", {})
            return float(data.get("baseScore", 0.0)), str(data.get("baseSeverity", ""))
    arr = metrics.get("cvssMetricV2") or []
    if arr:
        data = arr[0].get("cvssData", {})
        return float(data.get("baseScore", 0.0)), str(arr[0].get("baseSeverity", ""))
    return 0.0, ""


def _english_or_first(descriptions: list[dict[str, Any]]) -> str:
    for d in descriptions:
        if d.get("lang") == "en":
            return str(d.get("value", ""))
    return str(descriptions[0].get("value", "")) if descriptions else ""


def looks_like_version(v: str | None) -> bool:
    """True si el texto parece una versión numérica (17, 17.2, v2.1.3)."""
    return bool(v and _VERSION_RE.match(v.strip()))


def _collect(data: dict, min_cvss: float, label: str, version: str | None) -> list[CveItem]:
    """Convierte la respuesta de la NVD en CveItems filtrando por CVSS."""
    ver = (version or "").strip()
    out: list[CveItem] = []
    for v in data.get("vulnerabilities", []):
        cve = v.get("cve", {})
        score, sev = _best_cvss(cve.get("metrics", {}))
        if score < min_cvss:
            continue
        desc = _english_or_first(cve.get("descriptions", []))
        out.append({
            "cve_id": str(cve.get("id", "")),
            "descripcion": (desc[:280] + "…") if len(desc) > 280 else desc,
            "cvss": round(score, 1),
            "severidad": sev or ("CRITICAL" if score >= 9 else "HIGH"),
            "tecnologia": label,
            "version_match": bool(ver and ver in desc),
        })
    return out


async def _query(client: httpx.AsyncClient, params: dict, headers: dict,
                 min_cvss: float, label: str, version: str | None) -> list[CveItem]:
    params = {**params, "resultsPerPage": _RESULTS_PER_PAGE}
    try:
        resp = await client.get(_NVD_URL, params=params, headers=headers, timeout=12.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return []
    return _collect(data, min_cvss, label, version)


def _virtual_match(target: TechTarget) -> str:
    """Construye el virtualMatchString. Añade la versión solo si es numérica
    (así 'última'/'latest'/vacío no rompen el match → consulta por producto)."""
    cpe = (target["cpe"] or "").rstrip(":")
    if looks_like_version(target.get("version")):
        return f"{cpe}:{target['version'].strip().lstrip('v')}"
    return cpe


async def fetch_recent_cves(targets: list[TechTarget]) -> list[CveItem]:
    """Consulta la NVD para las tecnologías dadas. Lista vacía si no aplica.

    Por cada target: si tiene CPE → consulta por virtualMatchString (preciso,
    consciente de versión); si no → keywordSearch con el nombre limpio. Ordena
    por (versión coincide, CVSS) desc para que lo relevante quede arriba."""
    s = get_settings()
    if not s.nvd_enabled or not targets:
        return []

    # Dedup por (cpe|keyword) + recorte por prioridad de exposición.
    ordered_targets = sorted(targets, key=lambda t: t["prioridad"])
    seen: set[str] = set()
    uniq: list[TechTarget] = []
    for t in ordered_targets:
        clave = (t["cpe"] or t["keyword"]).strip().lower()
        if clave and clave not in seen:
            seen.add(clave)
            uniq.append(t)
    uniq = uniq[:_MAX_TARGETS]

    now = datetime.now(timezone.utc)
    lookback = min(s.nvd_lookback_days, _MAX_LOOKBACK_DAYS)
    start = (now - timedelta(days=lookback)).strftime("%Y-%m-%dT%H:%M:%S.000")
    end = now.strftime("%Y-%m-%dT%H:%M:%S.000")
    dates = {"pubStartDate": start, "pubEndDate": end}
    headers = {"apiKey": s.nvd_api_key} if s.nvd_api_key else {}

    results: list[CveItem] = []
    try:
        async with httpx.AsyncClient() as client:
            for i, t in enumerate(uniq):
                if i > 0:
                    # respeta el rate-limit sin API key (5 req/30s)
                    await asyncio.sleep(0 if s.nvd_api_key else 1.5)
                found: list[CveItem] = []
                if t["cpe"]:
                    found = await _query(client, {"virtualMatchString": _virtual_match(t), **dates}, headers, s.nvd_min_cvss, t["label"], t.get("version"))
                # Respaldo: si el CPE no dio resultados (slug erróneo o sin CVE en
                # la ventana) y hay keyword, reintenta por texto.
                if not found and t["keyword"]:
                    if t["cpe"]:
                        await asyncio.sleep(0 if s.nvd_api_key else 1.5)
                    found = await _query(client, {"keywordSearch": t["keyword"], **dates}, headers, s.nvd_min_cvss, t["label"], t.get("version"))
                results.extend(found)
    except httpx.HTTPError:
        pass

    # Dedup por CVE y orden por (versión coincide, CVSS) desc.
    by_id: dict[str, CveItem] = {}
    for c in results:
        if not c["cve_id"]:
            continue
        prev = by_id.get(c["cve_id"])
        # conserva la variante con version_match=True si existe
        if prev is None or (c["version_match"] and not prev["version_match"]):
            by_id[c["cve_id"]] = c
    ordered = sorted(by_id.values(), key=lambda c: (c["version_match"], c["cvss"]), reverse=True)
    return ordered[:_MAX_CVES]
