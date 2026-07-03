// Cliente HTTP hacia el AI service (FastAPI, puerto 8000).
//
// REGLA DE ARQUITECTURA: el navegador NUNCA llama al AI service. Solo este
// módulo, ejecutado en los Route Handlers de Next.js (server-side), habla con
// el AI service usando el secreto compartido AI_SERVICE_API_KEY.
//
// En local:      AI_SERVICE_URL=http://localhost:8000
// En docker:     AI_SERVICE_URL=http://ai-service:8000
// En producción: AI_SERVICE_URL=https://<ai-service-internal>  (ingress internal)

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY ?? "dev-shared-secret-change-me";

export class AiServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

async function call<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVICE_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = `AI service respondió ${res.status}`;
      try {
        const j = (await res.json()) as { detail?: string; error?: string };
        detail = j.detail ?? j.error ?? detail;
      } catch { /* keep default */ }
      throw new AiServiceError(res.status, detail);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof AiServiceError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new AiServiceError(504, "El AI service no respondió a tiempo");
    }
    throw new AiServiceError(503, "No se pudo conectar al AI service (¿está levantado en :8000?)");
  } finally {
    clearTimeout(timer);
  }
}

// ── Tipos espejo de los schemas Pydantic del AI service ──────────────────
export type ScopePreliminaryRequest = {
  organizacion: { nombre_organizacion: string; sector?: string; numero_colaboradores?: number; mision?: string; vision?: string; estado_sgsi?: string };
  sedes?: Array<{ codigo: string; nombre_sede: string; distrito_sede?: string; departamento_sede?: string; pais_sede?: string }>;
  procesos?: Array<{ codigo: string; nombre: string; tipo?: string; area?: string; criticidad?: string; descripcion?: string }>;
  activos?: Array<{ codigo: string; nombre: string; tipo?: string; clasificacion?: string; valoracion?: string; ubicacion?: string }>;
  factores?: Array<{ codigo: string; origen?: string; categoria?: string; tipo?: string; descripcion?: string; impacto?: string }>;
  partes?: Array<{ codigo: string; nombre: string; tipo?: string; expectativas?: string; relevancia?: string }>;
};

export type ScopePreliminaryResponse = {
  alcance: string;
  citas: Array<{ seccion: string | null; documento: string; score: number }>;
  usage: { input: number; output: number };
  iso_disponible: boolean;
};

export type VectorizeRequest = {
  organizacion_id: number;
  tabla_origen: string;
  registro_origen_id: number;
  campo_origen: string;
  chunk_texto: string;
  metadata?: Record<string, unknown>;
};

export type VectorizeResponse = { ok: boolean; tokens: number };

export type DeleteVectorsRequest = {
  organizacion_id: number;
  tabla_origen: string;
  registro_origen_id: number;
};
export type DeleteVectorsResponse = { ok: boolean; deleted: number };

// Objetivo del SGSI (cláusula 6.2) — orienta documentos y controles.
export type ObjetivoIn = { codigo: string; nombre: string; descripcion?: string; indicador?: string; meta?: string };

export type DocumentTemplateRequest = {
  tipo: string;
  nombre: string;
  alcance_sgsi?: string | null;
  organizacion: { nombre_organizacion: string; sector?: string; numero_colaboradores?: number; mision?: string; vision?: string; estado_sgsi?: string };
  objetivos?: ObjetivoIn[];
  // Información DENTRO del alcance del SGSI (incluido_alcance=true; activos derivados).
  sedes?: Array<{ codigo: string; nombre_sede: string; distrito_sede?: string; departamento_sede?: string; pais_sede?: string }>;
  procesos?: Array<{ codigo: string; nombre: string; tipo?: string; area?: string; criticidad?: string; descripcion?: string }>;
  activos?: Array<{ codigo: string; nombre: string; tipo?: string; clasificacion?: string; valoracion?: string }>;
  factores?: Array<{ codigo: string; origen?: string; categoria?: string; tipo?: string; descripcion?: string; impacto?: string }>;
  partes?: Array<{ codigo: string; nombre: string; tipo?: string; expectativas?: string; relevancia?: string }>;
  // Roles del SGSI (cláusula 5.3) — para la sección de Responsabilidades.
  roles?: Array<{ codigo: string; nombre: string; tipo?: string; responsabilidades?: string; autoridades?: string }>;
};
export type DocumentTemplateResponse = {
  contenido_html: string;
  citas: Array<{ seccion: string | null; documento: string; score: number }>;
  usage: { input: number; output: number };
  iso_disponible: boolean;
};

// ── /v1/risks/suggest — Sugeridor de escenarios de riesgo (4 dominios) ──────
export type RiskOrg = {
  nombre_organizacion: string; sector?: string; numero_colaboradores?: number;
  mision?: string; vision?: string; estado_sgsi?: string;
};
export type RiskActivo = {
  codigo: string; nombre: string; tipo?: string; clasificacion?: string;
  valoracion?: string; ubicacion?: string;
  // Tríada CIA — calibra el impacto por dimensión afectada.
  confidencialidad?: string; integridad?: string; disponibilidad?: string;
  // Procesos críticos que sostiene este activo (fundamenta el impacto).
  procesos?: Array<{ nombre: string; criticidad?: string; relacion?: string }>;
  // Exposición de red: 'interna' | 'externa' | 'nube'. Pondera el riesgo técnico
  // y prioriza la búsqueda NVD hacia los activos alcanzables desde internet.
  exposicion?: string | null;
  // Tecnología identificada → habilita el Patrón B (NVD) si modelo+version no son vacíos.
  modelo?: string; version?: string; proveedor?: string;
};
export type RiskSuggestRequest = {
  organizacion: RiskOrg;
  sedes?: Array<{ codigo: string; nombre_sede: string; distrito_sede?: string; departamento_sede?: string; pais_sede?: string }>;
  procesos?: Array<{ codigo: string; nombre: string; tipo?: string; area?: string; criticidad?: string; descripcion?: string }>;
  activos?: RiskActivo[];
  factores?: Array<{ codigo: string; origen?: string; categoria?: string; tipo?: string; descripcion?: string; impacto?: string }>;
  partes?: Array<{ codigo: string; nombre: string; tipo?: string; expectativas?: string; relevancia?: string }>;
  alcance_sgsi?: string | null;
  // Escenarios ya cubiertos (con amenaza/vuln) para reforzar la deduplicación.
  escenarios_existentes?: Array<{ nombre: string; dominio?: string; amenaza?: string; vulnerabilidad?: string; estado?: string; tratamiento?: string }>;
  criterios?: { max_prob: number; max_impact: number };
  dominios?: string[];
  por_dominio?: number;
};
export type SuggestedScenario = {
  dominio: string;
  nombre: string;
  descripcion: string;
  amenaza: string;
  vulnerabilidad: string;
  probabilidad: number;
  impacto: number;
  tratamiento_sugerido: string;
  justificacion: string;
  fuente_referencia: string;
};
export type RiskSuggestResponse = {
  escenarios: SuggestedScenario[];
  fuentes_disponibles: Record<string, boolean>;
  nvd_consultado: boolean;
  cve_encontrados: number;
  omitidos_similares: number;
  cve_descartados: number;
  usage: { input: number; output: number };
};

// ── API pública del cliente ──────────────────────────────────────────────
export const aiClient = {
  /** HU58 — genera alcance preliminar (RAG sobre ISO). */
  scopePreliminary(req: ScopePreliminaryRequest): Promise<ScopePreliminaryResponse> {
    return call<ScopePreliminaryResponse>("/v1/scope/preliminary", req);
  },

  /** HU57 — vectoriza un registro del tenant (síncrono). */
  vectorize(req: VectorizeRequest): Promise<VectorizeResponse> {
    return call<VectorizeResponse>("/v1/vectorize", req, 30_000);
  },

  /** HU57 — borra los vectores de un registro eliminado. */
  deleteVectors(req: DeleteVectorsRequest): Promise<DeleteVectorsResponse> {
    return call<DeleteVectorsResponse>("/v1/vectors/delete", req, 15_000);
  },

  /** HU59 — genera la plantilla HTML de un documento obligatorio. */
  documentTemplate(req: DocumentTemplateRequest): Promise<DocumentTemplateResponse> {
    return call<DocumentTemplateResponse>("/v1/documents/template", req);
  },

  /** HU60/HU61 — sugiere escenarios de riesgo en los 4 dominios (RAG + NVD). */
  suggestRisks(req: RiskSuggestRequest): Promise<RiskSuggestResponse> {
    // El sugeridor hace retrieval por dominio + NVD + 1 llamada LLM → puede tardar.
    return call<RiskSuggestResponse>("/v1/risks/suggest", req, 90_000);
  },

  /** SoA — sugiere controles del Anexo A que tratan los riesgos (RAG ISO 27002). */
  suggestControls(req: ControlSuggestRequest): Promise<ControlSuggestResponse> {
    return call<ControlSuggestResponse>("/v1/controls/suggest", req, 90_000);
  },

  /** SoA — genera el documento de evidencia de un control (HTML, RAG ISO 27002). */
  controlDocument(req: ControlDocumentRequest): Promise<DocumentTemplateResponse> {
    return call<DocumentTemplateResponse>("/v1/controls/document", req, 90_000);
  },
};

export type ControlDocumentRequest = {
  organizacion: RiskOrg;
  alcance_sgsi?: string | null;
  control: { codigo: string; nombre: string; descripcion?: string };
};

// ── /v1/controls/suggest — Sugeridor de controles del Anexo A (SoA) ──────────
export type ControlSuggestRequest = {
  organizacion: RiskOrg;
  alcance_sgsi?: string | null;
  riesgos: Array<{ codigo: string; nombre: string; descripcion?: string; amenaza?: string; vulnerabilidad?: string; dominio?: string; nivel_actual?: number; tratamiento?: string }>;
  controles_catalogo: Array<{ codigo: string; nombre: string; dominio?: string }>;
  controles_existentes?: string[];
  objetivos?: ObjetivoIn[];
};
export type SuggestedControl = {
  codigo: string;
  justificacion: string;
  riesgos_cubiertos: string[];
  fuente_referencia: string;
};
export type ControlSuggestResponse = {
  controles: SuggestedControl[];
  iso_disponible: boolean;
  usage: { input: number; output: number };
};
