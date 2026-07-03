"""Capa 2 — Normalización de tecnología (texto libre de la PYME) a CPE.

Una PYME describe su tecnología de forma imprecisa ("el GitLab de la web",
"Office 365", "router TP-Link") y casi nunca conoce el vendor/product/version
del estándar CPE de la NVD. Este módulo usa el LLM para mapear ese texto al CPE
canónico (cpe:2.3:part:vendor:product) + versión si es identificable, más un
keyword limpio de respaldo. Así el usuario NO necesita ingresar parámetros
exactos: el modelo traduce lo que sí sabe decir a una consulta precisa.

Degrada SIEMPRE a un target por keyword (limpio) si el LLM falla, no está
configurado, o no reconoce la tecnología con confianza.
"""

from __future__ import annotations

import json
import re

from langchain_core.prompts import ChatPromptTemplate

from app.llm import get_chat_model
from app.nvd import TechTarget

# Proveedores de hosting/nube: NO son el fabricante del software → se ignoran
# para la búsqueda de CVE (causa típica del 0-resultados: poner "Azure" como
# proveedor de un GitLab autoalojado).
_HOSTING = {
    "azure", "aws", "amazon", "ec2", "gcp", "google cloud", "googlecloud",
    "oracle cloud", "oci", "digitalocean", "heroku", "vercel", "netlify",
    "cloudflare", "on-prem", "on-premise", "on premise", "onpremise", "onprem",
    "cloud", "nube", "saas", "hosting", "vps", "servidor", "server",
}

_VERSION_TOKEN = re.compile(r"^v?\d+(\.\d+)*$")

_SYSTEM = """Eres un normalizador de tecnología al estándar CPE 2.3 de la NVD (NIST).

Recibes tecnologías descritas por una PYME (proveedor / modelo / versión), a menudo imprecisas o incompletas. Para CADA ítem, si reconoces el producto con confianza, devuelve su CPE oficial:
- "part": "a" (aplicación/software), "o" (sistema operativo) o "h" (hardware).
- "vendor" y "product": DOS slugs SEPARADOS del diccionario CPE de la NVD, en minúscula y con guion_bajo. NO los combines ni uses "/". Ejemplos (vendor → product): gitlab → gitlab; wordpress → wordpress; microsoft → windows_10; microsoft → 365_apps; microsoft → exchange_server; fortinet → fortios; openbsd → openssh; apache → http_server; nginx → nginx; atlassian → jira; vmware → vcenter_server; tp-link → archer_c7_firmware; openssl → openssl.
- "version": la versión SOLO si es numérica e identificable (ej. "17.2.1", "10"); si no, null.
- "keyword": nombre limpio del producto para búsqueda de respaldo (sin proveedor de hosting ni números de versión).

Reglas estrictas:
- IGNORA proveedores de hosting/nube (Azure, AWS, GCP, on-premise, etc.): NO son el fabricante. El vendor CPE es quien DESARROLLA el software.
- Si NO reconoces el producto con confianza, deja "vendor" y "product" en null, pero igual entrega un "keyword" limpio y útil.
- NO inventes slugs. Ante la duda, null (el sistema usará el keyword).

Devuelve SOLO JSON válido con esta forma exacta:
{{"items":[{{"i":<indice>,"part":"a|o|h","vendor":"<slug|null>","product":"<slug|null>","version":"<version|null>","keyword":"<texto>"}}]}}"""

_USER = """Tecnologías a normalizar:
{lista}

Devuelve el JSON con un objeto por cada índice."""


def _clean_keyword(proveedor: str, modelo: str) -> str:
    """Vendor + producto sin hosting ni números de versión, dedup case-insensitive."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in (proveedor, modelo):
        for tok in re.split(r"\s+", (raw or "").strip()):
            tl = tok.lower()
            if not tok or tl in _HOSTING or _VERSION_TOKEN.match(tl) or tl in seen:
                continue
            seen.add(tl)
            out.append(tok)
    return " ".join(out)


def _split_slug(vendor: str, product: str) -> tuple[str, str]:
    """Saneo defensivo: el LLM a veces mete 'vendor/product' combinado en uno o
    ambos campos, o usa espacios. Devuelve (vendor, product) como slugs CPE."""
    vendor = (vendor or "").strip().lower().replace(" ", "_")
    product = (product or "").strip().lower().replace(" ", "_")
    if "/" in vendor:
        v0, p0 = vendor.split("/", 1)
        vendor = v0
        if not product or "/" in product:
            product = product.split("/")[-1] if "/" in product else p0
    elif "/" in product:
        v0, p0 = product.split("/", 1)
        product = p0
        if not vendor:
            vendor = v0
    vendor = re.sub(r"[^a-z0-9._\-]", "", vendor)
    product = re.sub(r"[^a-z0-9._\-]", "", product)
    return vendor, product


def _fallback(item: dict) -> TechTarget:
    kw = _clean_keyword(item.get("proveedor", ""), item.get("modelo", ""))
    label = " ".join(p for p in (item.get("proveedor", ""), item.get("modelo", ""), item.get("version", "")) if p).strip()
    return {
        "label": label or kw or "tecnología",
        "cpe": None,
        "version": (item.get("version") or "").strip() or None,
        "keyword": kw,
        "prioridad": int(item.get("prioridad", 2)),
    }


def _parse(content: str) -> dict:
    txt = content.strip()
    txt = re.sub(r"^```(?:json)?", "", txt).strip()
    txt = re.sub(r"```$", "", txt).strip()
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return {}
        return {}


async def normalize_targets(items: list[dict]) -> list[TechTarget]:
    """Mapea activos {proveedor, modelo, version, prioridad} a TechTargets.

    Siempre devuelve un target por ítem (CPE si se reconoció, keyword si no).
    Nunca lanza: ante cualquier error degrada a targets por keyword."""
    items = [it for it in items if (it.get("modelo") or it.get("proveedor"))]
    if not items:
        return []

    from app.config import get_settings
    if not get_settings().nvd_cpe_normalize:
        return [_fallback(it) for it in items]

    fallbacks = {i: _fallback(it) for i, it in enumerate(items)}
    try:
        lista = "\n".join(
            f'  {i}. proveedor="{it.get("proveedor","")}" | modelo="{it.get("modelo","")}" | version="{it.get("version","")}"'
            for i, it in enumerate(items)
        )
        prompt = ChatPromptTemplate.from_messages([("system", _SYSTEM), ("user", _USER)])
        model = get_chat_model().bind(response_format={"type": "json_object"})
        messages = await prompt.aformat_messages(lista=lista)
        resp = await model.ainvoke(messages)
        data = _parse(resp.content if isinstance(resp.content, str) else str(resp.content))
    except Exception:
        return list(fallbacks.values())

    targets: list[TechTarget] = []
    by_index = {int(o["i"]): o for o in data.get("items", []) if isinstance(o, dict) and "i" in o}
    for i, it in enumerate(items):
        o = by_index.get(i)
        fb = fallbacks[i]
        if not o:
            targets.append(fb)
            continue
        vendor, product = _split_slug(o.get("vendor") or "", o.get("product") or "")
        part = (o.get("part") or "a").strip().lower()
        if part not in ("a", "o", "h"):
            part = "a"
        version = (o.get("version") or "").strip() or (it.get("version") or "").strip() or None
        keyword = (o.get("keyword") or "").strip() or fb["keyword"]
        cpe = f"cpe:2.3:{part}:{vendor}:{product}" if vendor and product else None
        targets.append({
            "label": fb["label"],
            "cpe": cpe,
            "version": version,
            "keyword": keyword,
            "prioridad": fb["prioridad"],
        })
    return targets
