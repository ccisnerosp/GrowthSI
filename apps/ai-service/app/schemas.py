"""Modelos Pydantic de request/response del AI service."""

from pydantic import BaseModel, Field


# ── /v1/scope/preliminary (HU58) ─────────────────────────────────────────
class SedeIn(BaseModel):
    codigo: str
    nombre_sede: str
    distrito_sede: str = ""
    departamento_sede: str = ""
    pais_sede: str = ""


class ProcesoIn(BaseModel):
    codigo: str
    nombre: str
    tipo: str = ""
    area: str = ""
    criticidad: str = ""
    descripcion: str = ""


class ActivoProcesoIn(BaseModel):
    """Proceso de negocio que el activo sostiene (relación proceso_activo)."""
    nombre: str
    criticidad: str = ""
    relacion: str = ""


class ActivoIn(BaseModel):
    codigo: str
    nombre: str
    tipo: str = ""
    clasificacion: str = ""
    valoracion: str = ""
    ubicacion: str = ""
    # Tríada CIA — calibra el impacto del escenario por dimensión afectada.
    confidencialidad: str = ""
    integridad: str = ""
    disponibilidad: str = ""
    # Procesos críticos que sostiene este activo (fundamenta el impacto).
    procesos: list[ActivoProcesoIn] = Field(default_factory=list)
    # Exposición de red: 'interna' | 'externa' | 'nube' (None = desconocida).
    exposicion: str | None = None
    # Tecnología identificada (habilita el Patrón B / NVD si no están vacíos).
    modelo: str = ""
    version: str = ""
    proveedor: str = ""


class FactorIn(BaseModel):
    codigo: str
    origen: str = ""
    categoria: str = ""
    tipo: str = ""
    descripcion: str = ""
    impacto: str = ""


class ParteIn(BaseModel):
    codigo: str
    nombre: str
    tipo: str = ""
    expectativas: str = ""
    relevancia: str = ""


class ObjetivoIn(BaseModel):
    """Objetivo del SGSI (cláusula 6.2) — da dirección a documentos y controles."""
    codigo: str
    nombre: str
    descripcion: str = ""
    indicador: str = ""
    meta: str = ""


class RolIn(BaseModel):
    """Rol del SGSI (cláusula 5.3) — alimenta la sección de Responsabilidades de
    los documentos. Sin el titular (dato personal): solo el rol y sus deberes."""
    codigo: str
    nombre: str
    tipo: str = ""
    responsabilidades: str = ""
    autoridades: str = ""


class OrgIn(BaseModel):
    nombre_organizacion: str
    sector: str = ""
    numero_colaboradores: int = 0
    mision: str = ""
    vision: str = ""
    estado_sgsi: str = ""


class ScopePreliminaryRequest(BaseModel):
    organizacion: OrgIn
    sedes: list[SedeIn] = Field(default_factory=list)
    procesos: list[ProcesoIn] = Field(default_factory=list)
    activos: list[ActivoIn] = Field(default_factory=list)
    factores: list[FactorIn] = Field(default_factory=list)
    partes: list[ParteIn] = Field(default_factory=list)


class Cita(BaseModel):
    seccion: str | None
    documento: str
    score: float


class Usage(BaseModel):
    input: int = 0
    output: int = 0


class ScopePreliminaryResponse(BaseModel):
    alcance: str
    citas: list[Cita] = Field(default_factory=list)
    usage: Usage = Field(default_factory=Usage)
    iso_disponible: bool = False


# ── /v1/vectorize (HU57) ─────────────────────────────────────────────────
class VectorizeRequest(BaseModel):
    organizacion_id: int
    tabla_origen: str
    registro_origen_id: int
    campo_origen: str
    chunk_texto: str
    metadata: dict = Field(default_factory=dict)


class VectorizeResponse(BaseModel):
    ok: bool
    tokens: int = 0


class DeleteVectorsRequest(BaseModel):
    organizacion_id: int
    tabla_origen: str
    registro_origen_id: int


class DeleteVectorsResponse(BaseModel):
    ok: bool
    deleted: int = 0


# ── /v1/ingest/iso ───────────────────────────────────────────────────────
class IngestResponse(BaseModel):
    chunks_persisted: int
    chunks_skipped: int
    total_tokens: int
    # Chunks descartados por el filtro de ruido (carátula, índice, referencias…).
    chunks_filtrados: int = 0


# ── /v1/documents/template (HU59) ─────────────────────────────────────────
class DocumentTemplateRequest(BaseModel):
    tipo: str
    nombre: str
    alcance_sgsi: str | None = None
    organizacion: OrgIn
    # Objetivos del SGSI (6.2) vigentes — alinean el contenido del documento.
    objetivos: list[ObjetivoIn] = Field(default_factory=list)
    # Información DENTRO del alcance del SGSI (incluido_alcance=true; los activos
    # derivan de los procesos en alcance). El documento debe ceñirse a esto y NO
    # introducir elementos fuera de alcance.
    sedes: list[SedeIn] = Field(default_factory=list)
    procesos: list[ProcesoIn] = Field(default_factory=list)
    activos: list[ActivoIn] = Field(default_factory=list)
    factores: list[FactorIn] = Field(default_factory=list)
    partes: list[ParteIn] = Field(default_factory=list)
    # Roles del SGSI (cláusula 5.3) — para la sección de Responsabilidades.
    roles: list[RolIn] = Field(default_factory=list)


class DocumentTemplateResponse(BaseModel):
    contenido_html: str
    citas: list[Cita] = Field(default_factory=list)
    usage: Usage = Field(default_factory=Usage)
    iso_disponible: bool = False


# ── /v1/risks/suggest — Sugeridor de escenarios de riesgo (4 dominios) ───────
class CriteriosIn(BaseModel):
    max_prob: int = 5
    max_impact: int = 5


class EscenarioExistenteIn(BaseModel):
    """Escenario ya registrado (o ya mostrado en la sesión) que NO debe repetirse.
    Se envía con amenaza/vulnerabilidad para reforzar la deduplicación (no solo el
    nombre) y con estado/tratamiento para priorizar ángulos nuevos sobre lo tratado."""
    nombre: str
    dominio: str = ""
    amenaza: str = ""
    vulnerabilidad: str = ""
    estado: str = ""
    tratamiento: str = ""


class RiskSuggestRequest(BaseModel):
    organizacion: OrgIn
    sedes: list[SedeIn] = Field(default_factory=list)
    procesos: list[ProcesoIn] = Field(default_factory=list)
    activos: list[ActivoIn] = Field(default_factory=list)
    factores: list[FactorIn] = Field(default_factory=list)
    partes: list[ParteIn] = Field(default_factory=list)
    alcance_sgsi: str | None = None
    escenarios_existentes: list[EscenarioExistenteIn] = Field(default_factory=list)
    criterios: CriteriosIn = Field(default_factory=CriteriosIn)
    # Dominios a generar; por defecto los 4 exigidos por ISO 27001:2022.
    dominios: list[str] = Field(default_factory=lambda: ["tecnologico", "organizacional", "personas", "fisico"])
    por_dominio: int = 2


class SuggestedScenario(BaseModel):
    dominio: str
    nombre: str
    descripcion: str
    amenaza: str
    vulnerabilidad: str
    probabilidad: int
    impacto: int
    tratamiento_sugerido: str = "mitigar"
    justificacion: str = ""
    fuente_referencia: str = ""


class RiskSuggestResponse(BaseModel):
    escenarios: list[SuggestedScenario] = Field(default_factory=list)
    # Por dominio: si hay material offline disponible para fundamentar.
    fuentes_disponibles: dict[str, bool] = Field(default_factory=dict)
    nvd_consultado: bool = False
    cve_encontrados: int = 0
    # Escenarios generados pero descartados por la guarda semántica (similares a
    # uno ya existente o a otro del mismo lote).
    omitidos_similares: int = 0
    # Citas CVE eliminadas por no estar en la lista NVD provista (anti-alucinación).
    cve_descartados: int = 0
    usage: Usage = Field(default_factory=Usage)


# ── /v1/controls/suggest — Sugeridor de controles del Anexo A (SoA) ──────────
class RiesgoMitigarIn(BaseModel):
    codigo: str
    nombre: str
    descripcion: str = ""
    amenaza: str = ""
    vulnerabilidad: str = ""
    dominio: str = ""
    nivel_actual: int = 0
    tratamiento: str = "mitigar"


class ControlCatalogoIn(BaseModel):
    codigo: str
    nombre: str
    dominio: str = ""


class ControlSuggestRequest(BaseModel):
    organizacion: OrgIn
    alcance_sgsi: str | None = None
    # Riesgos a tratar (típicamente los de tratamiento 'mitigar').
    riesgos: list[RiesgoMitigarIn] = Field(default_factory=list)
    # Catálogo válido de controles del Anexo A (Next.js lo envía; el AI service
    # no toca esa tabla). El LLM solo puede elegir códigos de aquí.
    controles_catalogo: list[ControlCatalogoIn] = Field(default_factory=list)
    # Códigos ya presentes en la SoA del tenant (no volver a sugerirlos).
    controles_existentes: list[str] = Field(default_factory=list)
    # Objetivos del SGSI (6.2) vigentes — orientan la selección de controles.
    objetivos: list[ObjetivoIn] = Field(default_factory=list)


class SuggestedControl(BaseModel):
    codigo: str
    justificacion: str = ""
    # Códigos de los riesgos que este control trata (N:N).
    riesgos_cubiertos: list[str] = Field(default_factory=list)
    fuente_referencia: str = ""


class ControlSuggestResponse(BaseModel):
    controles: list[SuggestedControl] = Field(default_factory=list)
    # Si había guía ISO 27002 ingestada para fundamentar.
    iso_disponible: bool = False
    usage: Usage = Field(default_factory=Usage)


# ── /v1/controls/document — Genera el documento de evidencia de un control ───
class ControlInfoIn(BaseModel):
    codigo: str
    nombre: str
    descripcion: str = ""


class ControlDocumentRequest(BaseModel):
    organizacion: OrgIn
    alcance_sgsi: str | None = None
    control: ControlInfoIn
    # Reutiliza DocumentTemplateResponse como respuesta (contenido_html, citas, usage…).
