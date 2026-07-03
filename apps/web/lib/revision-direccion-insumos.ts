// Revisión por la Dirección (9.3) — ENSAMBLADO DETERMINISTA de los insumos 9.3.2.
//
// Consulta cada módulo del SGSI y devuelve un objeto serializable con los datos
// de entrada que exige la cláusula 9.3.2. SIN IA: son consultas Prisma + aritmética.
// El resultado se congela en `revision_direccion.insumos_snapshot` al crear la
// revisión, para trazabilidad/reproducibilidad y para calcular deltas en la siguiente.

import { prisma } from "@/lib/db";
import { cumpleMeta } from "@/lib/objetivos-medicion";

export type Insumos = {
  periodo: { desde: string; hasta: string };
  // 9.3.2 a) — estado de acciones de revisiones previas
  acciones_previas: { total: number; pendientes: number; en_progreso: number; hechas: number; vencidas: number };
  // 9.3.2 b/d) — cambios de contexto y partes interesadas
  contexto: { factores_total: number; factores_internos: number; factores_externos: number; factores_nuevos: number; partes_total: number };
  // 9.3.2 c) — auditorías (9.2)
  auditorias: { total_periodo: number; completadas: number; hallazgos_total: number; hallazgos_abiertos: number; hallazgos_criticos: number };
  // 9.3.2 c) — no conformidades y acciones correctivas (10.2)
  no_conformidades: { total: number; abiertas: number; cerradas_periodo: number; vencidas: number; criticas_abiertas: number };
  // 9.3.2 c) — cumplimiento de objetivos (9.1). `medibles/medidos/cumplen_meta`
  // derivan de las mediciones reales (P2): evaluación objetiva, no etiqueta manual.
  objetivos: { total: number; cumplidos: number; en_curso: number; activos: number; inactivos: number; medibles: number; medidos: number; cumplen_meta: number };
  // 9.3.2 e) — riesgos y estado del plan de tratamiento
  riesgos: { total: number; criticos: number; fuera_tolerancia: number; nivel_residual_prom: number; reevaluaciones_periodo: number };
  controles: { aplican: number; implementados: number; parciales: number; pendientes: number; pct_implementacion: number };
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Calcula los insumos 9.3.2 para una organización y periodo dados. */
export async function computeInsumos(orgId: number, desde: Date, hasta: Date): Promise<Insumos> {
  // El "hasta" incluye todo el día.
  const hastaFin = new Date(hasta);
  hastaFin.setHours(23, 59, 59, 999);
  const hoy = new Date();

  const org = await prisma.organizacion.findUnique({
    where: { id: orgId },
    select: { criterio_riesgo_p: true, criterio_riesgo_i: true, tolerancia_riesgo: true },
  });
  const maxScore = (org?.criterio_riesgo_p ?? 5) * (org?.criterio_riesgo_i ?? 5);
  const tolerancia = org?.tolerancia_riesgo ?? null;
  const umbralCritico = maxScore * 0.6;

  const [
    acciones, factores, factoresNuevos, partesTotal,
    auditorias, noConf, objetivos, riesgos, reevaluaciones, controles,
  ] = await Promise.all([
    prisma.revisionDireccionAccion.findMany({
      where: { revision: { organizacion_id: orgId, deleted_at: null } },
      select: { estado: true, fecha_objetivo: true },
    }),
    prisma.factor.findMany({ where: { organizacion_id: orgId }, select: { origen: true } }),
    prisma.factor.count({ where: { organizacion_id: orgId, fecha_identificacion: { gte: desde, lte: hastaFin } } }),
    prisma.partesInteresadas.count({ where: { organizacion_id: orgId } }),
    prisma.auditoria.findMany({
      where: { organizacion_id: orgId, deleted_at: null, fecha_inicio: { lte: hastaFin }, fecha_fin: { gte: desde } },
      select: { estado: true, hallazgos: { select: { estado: true, severidad: true } } },
    }),
    prisma.noConformidad.findMany({
      where: { auditoria: { organizacion_id: orgId }, deleted_at: null },
      select: { estado: true, severidad: true, fecha_vencimiento: true, fecha_cierre: true },
    }),
    prisma.objetivoSgsi.findMany({
      where: { organizacion_id: orgId },
      select: { estado: true, meta_valor: true, meta_operador: true, mediciones: { orderBy: [{ fecha_medicion: "desc" }, { id: "desc" }], take: 1, select: { valor: true } } },
    }),
    prisma.riesgo.findMany({
      where: { deleted_at: null, escenario: { organizacion_id: orgId } },
      select: { nivel_actual: true },
    }),
    prisma.riesgoHistorial.count({
      where: { created_at: { gte: desde, lte: hastaFin }, riesgo: { escenario: { organizacion_id: orgId } } },
    }),
    prisma.controlSoa.findMany({ where: { organizacion_id: orgId, aplica: true }, select: { estado: true } }),
  ]);

  // Acciones previas
  const accVencida = (a: { estado: string; fecha_objetivo: Date | null }) =>
    a.fecha_objetivo != null && a.fecha_objetivo < hoy && a.estado !== "hecho" && a.estado !== "cancelada";

  // Auditorías + hallazgos
  const hallazgos = auditorias.flatMap((a) => a.hallazgos);

  // Riesgos
  const niveles = riesgos.map((r) => r.nivel_actual);
  const prom = niveles.length ? niveles.reduce((s, n) => s + n, 0) / niveles.length : 0;

  return {
    periodo: { desde: iso(desde), hasta: iso(hasta) },
    acciones_previas: {
      total: acciones.length,
      pendientes: acciones.filter((a) => a.estado === "pendiente").length,
      en_progreso: acciones.filter((a) => a.estado === "en_progreso").length,
      hechas: acciones.filter((a) => a.estado === "hecho").length,
      vencidas: acciones.filter(accVencida).length,
    },
    contexto: {
      factores_total: factores.length,
      factores_internos: factores.filter((f) => f.origen === "interno").length,
      factores_externos: factores.filter((f) => f.origen === "externo").length,
      factores_nuevos: factoresNuevos,
      partes_total: partesTotal,
    },
    auditorias: {
      total_periodo: auditorias.length,
      completadas: auditorias.filter((a) => a.estado === "completada").length,
      hallazgos_total: hallazgos.length,
      hallazgos_abiertos: hallazgos.filter((h) => h.estado === "abierto").length,
      hallazgos_criticos: hallazgos.filter((h) => h.severidad === "critica" && h.estado === "abierto").length,
    },
    no_conformidades: {
      total: noConf.length,
      abiertas: noConf.filter((n) => n.estado !== "cerrada").length,
      cerradas_periodo: noConf.filter((n) => n.fecha_cierre != null && n.fecha_cierre >= desde && n.fecha_cierre <= hastaFin).length,
      vencidas: noConf.filter((n) => n.estado !== "cerrada" && n.fecha_vencimiento < hoy).length,
      criticas_abiertas: noConf.filter((n) => n.severidad === "critica" && n.estado !== "cerrada").length,
    },
    objetivos: {
      total: objetivos.length,
      cumplidos: objetivos.filter((o) => o.estado === "cumplido").length,
      en_curso: objetivos.filter((o) => o.estado === "en_curso").length,
      activos: objetivos.filter((o) => o.estado === "activo" || o.estado === "aprobado").length,
      inactivos: objetivos.filter((o) => o.estado === "inactivo").length,
      // P2 — medición objetiva (9.1)
      medibles: objetivos.filter((o) => o.meta_valor != null).length,
      medidos: objetivos.filter((o) => o.meta_valor != null && o.mediciones.length > 0).length,
      cumplen_meta: objetivos.filter((o) => o.meta_valor != null && o.mediciones.length > 0 && cumpleMeta(o.mediciones[0].valor, o.meta_operador, o.meta_valor)).length,
    },
    riesgos: {
      total: riesgos.length,
      criticos: niveles.filter((n) => n >= umbralCritico).length,
      fuera_tolerancia: tolerancia != null ? niveles.filter((n) => n > tolerancia).length : 0,
      nivel_residual_prom: Math.round(prom * 10) / 10,
      reevaluaciones_periodo: reevaluaciones,
    },
    controles: {
      aplican: controles.length,
      implementados: controles.filter((c) => c.estado === "implementado").length,
      parciales: controles.filter((c) => c.estado === "parcial").length,
      pendientes: controles.filter((c) => ["no_iniciado", "planificado", "generado"].includes(c.estado)).length,
      pct_implementacion: controles.length ? Math.round((controles.filter((c) => c.estado === "implementado").length / controles.length) * 100) : 0,
    },
  };
}

/** Checklist de completitud 9.3.2 (por reglas, sin IA): marca insumos faltantes. */
export function checkCompletitud(ins: Insumos): Array<{ clausula: string; etiqueta: string; ok: boolean; nota: string }> {
  return [
    { clausula: "9.3.2 a", etiqueta: "Acciones de revisiones previas", ok: true,
      nota: ins.acciones_previas.total === 0 ? "Primera revisión: sin acciones previas." : `${ins.acciones_previas.total} acción(es); ${ins.acciones_previas.vencidas} vencida(s).` },
    { clausula: "9.3.2 b/d", etiqueta: "Contexto y partes interesadas", ok: ins.contexto.factores_total > 0 || ins.contexto.partes_total > 0,
      nota: ins.contexto.factores_total === 0 && ins.contexto.partes_total === 0 ? "Sin factores I/E ni partes interesadas registradas." : `${ins.contexto.factores_total} factores · ${ins.contexto.partes_total} partes.` },
    { clausula: "9.3.2 c", etiqueta: "Resultados de auditoría", ok: ins.auditorias.total_periodo > 0,
      nota: ins.auditorias.total_periodo === 0 ? "No hay auditorías en el periodo." : `${ins.auditorias.total_periodo} auditoría(s), ${ins.auditorias.hallazgos_abiertos} hallazgo(s) abierto(s).` },
    { clausula: "9.3.2 c", etiqueta: "No conformidades y acciones correctivas", ok: true,
      nota: `${ins.no_conformidades.abiertas} abierta(s), ${ins.no_conformidades.vencidas} vencida(s).` },
    { clausula: "9.3.2 c", etiqueta: "Cumplimiento de objetivos (9.1)",
      ok: ins.objetivos.total > 0 && (ins.objetivos.medibles === 0 || ins.objetivos.medidos === ins.objetivos.medibles),
      nota: ins.objetivos.total === 0 ? "Sin objetivos del SGSI definidos."
        : ins.objetivos.medibles === 0 ? `${ins.objetivos.total} objetivo(s), todos cualitativos (sin meta medible).`
        : `${ins.objetivos.medidos}/${ins.objetivos.medibles} medibles con medición; ${ins.objetivos.cumplen_meta} cumplen meta.` },
    { clausula: "9.3.2 e", etiqueta: "Resultados de riesgos y tratamiento", ok: ins.riesgos.total > 0,
      nota: ins.riesgos.total === 0 ? "Sin riesgos evaluados." : `${ins.riesgos.criticos} crítico(s), ${ins.riesgos.fuera_tolerancia} fuera de tolerancia; controles ${ins.controles.pct_implementacion}% implementados.` },
  ];
}
