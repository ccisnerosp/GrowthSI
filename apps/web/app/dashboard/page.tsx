import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/app/_components/app-shell";
import { computeCobertura, resumenCobertura, type DocLink } from "@/lib/obligatorios";
import { modulosPendientesAlcance } from "@/lib/alcance-revision";
import { DashboardClient } from "./dashboard-client";

// M5 — Dashboard ejecutivo del SGSI. Indicadores no negociables, datos reales.
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const orgId = session.user.organizacion_id;

  const [org, catalogo, soaRows, riesgos, generados, documentos, aprobPend, auditorias, hallazgos, ncs, catObl, docsObl, objetivosCount] = await Promise.all([
    prisma.organizacion.findUnique({
      where: { id: orgId },
      select: { nombre_organizacion: true, estado_sgsi: true, alcance_sgsi: true, criterio_riesgo_p: true, criterio_riesgo_i: true, apetito_riesgo: true, tolerancia_riesgo: true },
    }),
    prisma.controlAnexoA.findMany({ select: { id: true, dominio: true } }),
    prisma.controlSoa.findMany({ where: { organizacion_id: orgId }, select: { aplica: true, estado: true, origen: true, control_anexo_a: { select: { dominio: true } } } }),
    prisma.riesgo.findMany({ where: { deleted_at: null, escenario: { organizacion_id: orgId } }, select: { codigo: true, nombre: true, nivel_actual: true, estado: true, tratamiento: true } }),
    prisma.escenarioRiesgo.count({ where: { organizacion_id: orgId, deleted_at: null, estado: "generado" } }),
    prisma.documento.findMany({ where: { organizacion_id: orgId, deleted_at: null }, select: { estado: true, obligatorio: true } }),
    prisma.aprobacion.count({ where: { organizacion_id: orgId, estado: "pendiente" } }),
    prisma.auditoria.findMany({ where: { organizacion_id: orgId, deleted_at: null }, select: { codigo: true, nombre: true, estado: true, fecha_inicio: true } }),
    prisma.auditoriaHallazgo.findMany({ where: { auditoria: { organizacion_id: orgId, deleted_at: null } }, select: { severidad: true, estado: true } }),
    prisma.noConformidad.findMany({ where: { deleted_at: null, auditoria: { organizacion_id: orgId } }, select: { estado: true, severidad: true, fecha_vencimiento: true } }),
    prisma.documentoObligatorio.findMany({ orderBy: { orden: "asc" } }),
    prisma.documento.findMany({ where: { organizacion_id: orgId, deleted_at: null, obligatorio_id: { not: null } }, select: { id: true, codigo: true, nombre: true, estado: true, obligatorio_id: true } }),
    prisma.objetivoSgsi.count({ where: { organizacion_id: orgId } }),
  ]);
  if (!org) redirect("/login");

  const hoy = new Date().toISOString().slice(0, 10);
  const maxScore = (org.criterio_riesgo_p ?? 5) * (org.criterio_riesgo_i ?? 5);
  const tolerancia = org.tolerancia_riesgo;
  const apetito = org.apetito_riesgo;

  // ── SoA / Anexo A ──────────────────────────────────────────────────────
  const DOMS = ["Organizacional", "Personas", "Físico", "Tecnológico"] as const;
  const totalByDom: Record<string, number> = {};
  for (const c of catalogo) totalByDom[c.dominio] = (totalByDom[c.dominio] ?? 0) + 1;
  const aplican = soaRows.filter((s) => s.aplica && s.estado !== "no_aplica");
  const implementados = soaRows.filter((s) => s.estado === "implementado").length;
  const parciales = soaRows.filter((s) => s.estado === "parcial").length;
  const soaGenerados = soaRows.filter((s) => s.estado === "generado").length;
  const anexoPorTema = DOMS.map((d) => {
    const total = totalByDom[d] ?? 0;
    const apl = aplican.filter((s) => s.control_anexo_a.dominio === d).length;
    const impl = soaRows.filter((s) => s.control_anexo_a.dominio === d && s.estado === "implementado").length;
    return { dominio: d, total, aplican: apl, implementados: impl };
  });
  const madurez = aplican.length > 0 ? Math.round((implementados / aplican.length) * 100) : 0;

  // ── Riesgos (posture = revisados, no 'generado') ────────────────────────
  const reg = riesgos.filter((r) => r.estado !== "generado");
  const band = (n: number) => { const p = n / maxScore; return p >= 0.6 ? "critico" : p >= 0.4 ? "alto" : p >= 0.2 ? "medio" : "bajo"; };
  const niveles = { critico: 0, alto: 0, medio: 0, bajo: 0 } as Record<string, number>;
  for (const r of reg) niveles[band(r.nivel_actual)]++;
  const trat = { mitigar: 0, transferir: 0, aceptar: 0, evitar: 0 } as Record<string, number>;
  for (const r of reg) trat[r.tratamiento] = (trat[r.tratamiento] ?? 0) + 1;
  const fueraTol = tolerancia != null ? reg.filter((r) => r.nivel_actual > tolerancia).length : null;
  const topRiesgos = [...reg].sort((a, b) => b.nivel_actual - a.nivel_actual).slice(0, 5)
    .map((r) => ({ codigo: r.codigo, nombre: r.nombre, nivel: r.nivel_actual, band: band(r.nivel_actual) }));

  // ── Documentos ──────────────────────────────────────────────────────────
  const docEstados = { borrador: 0, revision: 0, aprobado: 0 } as Record<string, number>;
  for (const d of documentos) docEstados[d.estado] = (docEstados[d.estado] ?? 0) + 1;
  const docVigentes = documentos.length > 0 ? Math.round((docEstados.aprobado / documentos.length) * 100) : 0;

  // ── Auditorías / hallazgos ───────────────────────────────────────────────
  const audEstados = { planificada: 0, "en-curso": 0, completada: 0 } as Record<string, number>;
  for (const a of auditorias) audEstados[a.estado] = (audEstados[a.estado] ?? 0) + 1;
  const proxima = auditorias
    .filter((a) => a.estado !== "completada")
    .map((a) => ({ codigo: a.codigo, nombre: a.nombre, fecha: a.fecha_inicio.toISOString().slice(0, 10) }))
    .filter((a) => a.fecha >= hoy)
    .sort((x, y) => x.fecha.localeCompare(y.fecha))[0] ?? null;
  const halAbiertos = hallazgos.filter((h) => h.estado !== "cerrado").length;
  const halCriticos = hallazgos.filter((h) => h.severidad === "critica" && h.estado !== "cerrado").length;

  // ── No conformidades ──────────────────────────────────────────────────────
  const NC_COLS = ["identificada", "analisis", "plan", "ejecucion", "cerrada"] as const;
  const ncPorEstado = NC_COLS.map((e) => ({ estado: e, n: ncs.filter((n) => n.estado === e).length }));
  const ncAbiertas = ncs.filter((n) => n.estado !== "cerrada").length;
  const ncVencidas = ncs.filter((n) => n.estado !== "cerrada" && n.fecha_vencimiento.toISOString().slice(0, 10) < hoy).length;
  const ncCriticas = ncs.filter((n) => n.estado !== "cerrada" && n.severidad === "critica").length;

  // ── Información documentada obligatoria (ISO 27001) ───────────────────────
  const docsByItem = new Map<number, DocLink>();
  for (const dd of docsObl) if (dd.obligatorio_id != null && !docsByItem.has(dd.obligatorio_id)) {
    docsByItem.set(dd.obligatorio_id, { id: dd.id, codigo: dd.codigo, nombre: dd.nombre, estado: dd.estado });
  }
  const oblFlags = {
    alcance: !!(org.alcance_sgsi && org.alcance_sgsi.trim().length > 0),
    soa: aplican.length > 0, objetivos: objetivosCount > 0, auditorias: auditorias.length > 0, nc: ncs.length > 0, riesgos: reg.length > 0,
  };
  const oblResumen = resumenCobertura(computeCobertura(catObl, docsByItem, oblFlags));

  // ── Revisión pendiente por cambio de alcance (4.3 → 6.1/7.5/8.3) ──────────
  const alcancePendientes = await modulosPendientesAlcance(orgId);

  return (
    <AppShell current="dashboard">
      <DashboardClient
        nombre={session.user.nombre}
        rol={session.user.rol}
        data={{
          estadoSgsi: org.estado_sgsi, maxScore, apetito, tolerancia,
          madurez, anexo: { total: catalogo.length, aplican: aplican.length, implementados, parciales, generados: soaGenerados, porTema: anexoPorTema },
          riesgos: { total: reg.length, porRevisar: generados, niveles, tratamiento: trat, fueraTol, top: topRiesgos },
          documentos: { total: documentos.length, vigentes: docVigentes, estados: docEstados, obligatorios: documentos.filter((d) => d.obligatorio).length },
          obligatorios: { total: oblResumen.total, cubiertos: oblResumen.cubiertos, faltantes: oblResumen.faltantes, pct: oblResumen.pct },
          auditorias: { total: auditorias.length, estados: audEstados, proxima, halAbiertos, halCriticos },
          nc: { total: ncs.length, abiertas: ncAbiertas, vencidas: ncVencidas, criticas: ncCriticas, porEstado: ncPorEstado },
          pendientes: { aprobaciones: aprobPend, riesgosPorRevisar: generados, controlesPorRevisar: soaGenerados, docsRevision: docEstados.revision, ncVencidas, alcanceRevision: alcancePendientes.length },
        }}
      />
    </AppShell>
  );
}
