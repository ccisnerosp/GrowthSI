// Revisión aguas abajo tras editar el alcance del SGSI (cláusula 4.3).
// Un cambio de alcance sella `organizacion.alcance_modificado_at`; cada módulo
// (documentos | riesgos | controles) queda "pendiente de revisión" hasta que se
// registre una RevisionAlcance con revisado_at ≥ alcance_modificado_at.

import { prisma } from "@/lib/db";

export const MODULOS_ALCANCE = ["documentos", "riesgos", "controles"] as const;
export type ModuloAlcance = (typeof MODULOS_ALCANCE)[number];

export const MODULO_ALCANCE_LABEL: Record<ModuloAlcance, string> = {
  documentos: "Documentos",
  riesgos: "Riesgos",
  controles: "Controles (SoA)",
};

export type RevisionInfo = {
  modificadoAt: string | null; // fecha del último cambio del alcance (YYYY-MM-DD) o null
  pendiente: boolean;          // este módulo requiere revisión
  ultimaRevision: { at: string; por: string | null } | null;
};

/** ¿Está pendiente de revisión un módulo concreto tras el último cambio de alcance? */
export async function revisionPendiente(orgId: number, modulo: ModuloAlcance): Promise<RevisionInfo> {
  const org = await prisma.organizacion.findUnique({
    where: { id: orgId },
    select: { alcance_modificado_at: true },
  });
  const modificadoAt = org?.alcance_modificado_at ?? null;
  if (!modificadoAt) return { modificadoAt: null, pendiente: false, ultimaRevision: null };

  const ultima = await prisma.revisionAlcance.findFirst({
    where: { organizacion_id: orgId, modulo },
    orderBy: { revisado_at: "desc" },
    select: { revisado_at: true, usuario: { select: { nombre: true } } },
  });
  const revisadaDespues = !!ultima && ultima.revisado_at >= modificadoAt;
  return {
    modificadoAt: modificadoAt.toISOString().slice(0, 10),
    pendiente: !revisadaDespues,
    ultimaRevision: ultima
      ? { at: ultima.revisado_at.toISOString().slice(0, 10), por: ultima.usuario?.nombre ?? null }
      : null,
  };
}

/** Para el Dashboard: módulos pendientes de revisión tras el último cambio de alcance. */
export async function modulosPendientesAlcance(orgId: number): Promise<ModuloAlcance[]> {
  const org = await prisma.organizacion.findUnique({
    where: { id: orgId },
    select: { alcance_modificado_at: true },
  });
  const modificadoAt = org?.alcance_modificado_at ?? null;
  if (!modificadoAt) return [];

  const revisiones = await prisma.revisionAlcance.findMany({
    where: { organizacion_id: orgId, revisado_at: { gte: modificadoAt } },
    select: { modulo: true },
  });
  const revisados = new Set(revisiones.map((r) => r.modulo));
  return MODULOS_ALCANCE.filter((m) => !revisados.has(m));
}
