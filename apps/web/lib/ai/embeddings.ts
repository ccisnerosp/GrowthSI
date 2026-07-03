// HU57 — Vectorización (delegada al AI service).
//
// Tras la migración a 2 servicios, Next.js ya NO embebe ni hace cosine en
// proceso. Estas funciones son thin wrappers sobre lib/ai-client.ts que
// llaman al AI service (FastAPI :8000), el cual owna pgvector.
//
// Se mantienen las MISMAS firmas que la versión anterior para que los 10
// route handlers de CRUD no cambien.

import { aiClient } from "@/lib/ai-client";

export type TablaOrigen =
  | "factor"
  | "partes_interesadas"
  | "proceso"
  | "activo_informacion"
  | "sede"
  | "organizacion"
  | "documento"
  | "escenario_riesgo";

type VectorizeParams = {
  organizacion_id: number;
  tabla_origen: TablaOrigen;
  registro_origen_id: number | bigint;
  campo_origen: string;
  chunk_texto: string;
  metadata?: Record<string, unknown>;
};

/**
 * Vectoriza un registro vía el AI service. No lanza si el AI service falla
 * (cuota, red, servicio caído): registra warn y devuelve { ok:false }. Así el
 * CRUD del usuario nunca se rompe por un problema de IA.
 */
export async function vectorizeRecordSafe(
  params: VectorizeParams,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await aiClient.vectorize({
      organizacion_id: params.organizacion_id,
      tabla_origen: params.tabla_origen,
      registro_origen_id: Number(params.registro_origen_id),
      campo_origen: params.campo_origen,
      chunk_texto: params.chunk_texto,
      metadata: params.metadata,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[vectorize] ${params.tabla_origen}#${params.registro_origen_id} failed: ${msg}`);
    return { ok: false, error: msg };
  }
}

/** Borra los vectores de un registro eliminado (vía AI service). No lanza. */
export async function deleteRecordVectors(params: {
  organizacion_id: number;
  tabla_origen: TablaOrigen;
  registro_origen_id: number | bigint;
}): Promise<void> {
  try {
    await aiClient.deleteVectors({
      organizacion_id: params.organizacion_id,
      tabla_origen: params.tabla_origen,
      registro_origen_id: Number(params.registro_origen_id),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[delete-vectors] ${params.tabla_origen}#${params.registro_origen_id} failed: ${msg}`);
  }
}
