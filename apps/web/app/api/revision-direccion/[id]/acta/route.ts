// Revisión por la Dirección — generar el ACTA (salida documentada 9.3).
// Plantilla HTML DETERMINISTA (sin IA): rellena con los insumos congelados +
// lo redactado por la Dirección. Crea/actualiza un Documento (tipo 'Revisión por
// la Dirección') enlazado al obligatorio OBL-9.3, y lo asocia a la revisión.

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { sanitizeDocumentHtml } from "@/lib/sanitize-html";
import type { Insumos } from "@/lib/revision-direccion-insumos";

type Ctx = { params: Promise<{ id: string }> };

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TIPO_LBL: Record<string, string> = {
  mejora: "Mejora", cambio_control: "Cambio de control", cambio_objetivo: "Cambio de objetivo",
  recurso: "Recurso", politica: "Política", otro: "Otro",
};

function buildActaHtml(rev: {
  codigo: string; fecha_revision: Date; periodo_desde: Date; periodo_hasta: Date;
  asistentes: string; conclusiones: string;
  acciones: Array<{ descripcion: string; tipo: string; prioridad: string; estado: string; fecha_objetivo: Date | null; responsable: { nombre: string } | null }>;
}, ins: Insumos | null, orgNombre: string): string {
  const f = (d: Date) => d.toISOString().slice(0, 10);
  const i = ins;
  const insumosHtml = !i ? "<p><em>Sin insumos calculados.</em></p>" : `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
      <tr><th align="left">Insumo (cláusula 9.3.2)</th><th align="left">Resultado</th></tr>
      <tr><td>a) Acciones de revisiones previas</td><td>${i.acciones_previas.total} en total · ${i.acciones_previas.pendientes} pendientes · ${i.acciones_previas.en_progreso} en progreso · ${i.acciones_previas.hechas} hechas · <b>${i.acciones_previas.vencidas} vencidas</b></td></tr>
      <tr><td>b/d) Contexto y partes interesadas</td><td>${i.contexto.factores_total} factores I/E (${i.contexto.factores_internos} internos, ${i.contexto.factores_externos} externos; ${i.contexto.factores_nuevos} nuevos en el periodo) · ${i.contexto.partes_total} partes interesadas</td></tr>
      <tr><td>c) Resultados de auditoría (9.2)</td><td>${i.auditorias.total_periodo} auditoría(s), ${i.auditorias.completadas} completada(s); ${i.auditorias.hallazgos_total} hallazgo(s), ${i.auditorias.hallazgos_abiertos} abierto(s), ${i.auditorias.hallazgos_criticos} crítico(s)</td></tr>
      <tr><td>c) No conformidades y acción correctiva (10.2)</td><td>${i.no_conformidades.total} en total · ${i.no_conformidades.abiertas} abiertas · ${i.no_conformidades.cerradas_periodo} cerradas en el periodo · <b>${i.no_conformidades.vencidas} vencidas</b> · ${i.no_conformidades.criticas_abiertas} críticas abiertas</td></tr>
      <tr><td>c) Cumplimiento de objetivos (9.1)</td><td>${i.objetivos.total} objetivo(s): ${i.objetivos.cumplidos} marcados cumplidos, ${i.objetivos.en_curso} en curso. Medición objetiva: ${i.objetivos.medidos}/${i.objetivos.medibles} objetivos medibles con medición, <b>${i.objetivos.cumplen_meta} cumplen su meta</b>.</td></tr>
      <tr><td>e) Riesgos y plan de tratamiento</td><td>${i.riesgos.total} riesgo(s); ${i.riesgos.criticos} crítico(s); ${i.riesgos.fuera_tolerancia} fuera de tolerancia; nivel residual promedio ${i.riesgos.nivel_residual_prom}; ${i.riesgos.reevaluaciones_periodo} reevaluación(es) en el periodo. Controles: ${i.controles.implementados}/${i.controles.aplican} implementados (${i.controles.pct_implementacion}%).</td></tr>
    </table>`;

  const accionesHtml = rev.acciones.length === 0 ? "<p><em>Sin acciones de mejora registradas.</em></p>" : `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
      <tr><th align="left">Acción</th><th align="left">Tipo</th><th align="left">Prioridad</th><th align="left">Responsable</th><th align="left">Plazo</th><th align="left">Estado</th></tr>
      ${rev.acciones.map((a) => `<tr><td>${esc(a.descripcion)}</td><td>${TIPO_LBL[a.tipo] ?? a.tipo}</td><td>${a.prioridad}</td><td>${a.responsable ? esc(a.responsable.nombre) : "—"}</td><td>${a.fecha_objetivo ? f(a.fecha_objetivo) : "—"}</td><td>${a.estado}</td></tr>`).join("")}
    </table>`;

  return `
    <h1>Acta de Revisión por la Dirección</h1>
    <p><b>Organización:</b> ${esc(orgNombre)} · <b>Código:</b> ${rev.codigo}</p>
    <p><b>Fecha de la revisión:</b> ${f(rev.fecha_revision)} · <b>Periodo evaluado:</b> ${f(rev.periodo_desde)} a ${f(rev.periodo_hasta)}</p>
    <p><b>Asistentes:</b> ${esc(rev.asistentes) || "—"}</p>
    <h2>1. Entradas de la revisión (cláusula 9.3.2)</h2>
    ${insumosHtml}
    <h2>2. Conclusiones y decisiones de la Dirección (cláusula 9.3.3)</h2>
    <div>${rev.conclusiones ? esc(rev.conclusiones).replace(/\n/g, "<br/>") : "<em>Pendiente de redactar.</em>"}</div>
    <h2>3. Acciones de mejora acordadas</h2>
    ${accionesHtml}
    <hr/>
    <p style="font-size:11px;color:#666">Generado automáticamente por GrowthSI a partir de los registros del SGSI. Información documentada requerida por ISO/IEC 27001:2022, cláusula 9.3 (OBL-9.3).</p>`;
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("revision_direccion", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const orgId = session.user.organizacion_id;

  try {
    const [rev, org] = await Promise.all([
      prisma.revisionDireccion.findUnique({
        where: { id },
        include: { acciones: { orderBy: { id: "asc" }, include: { responsable: { select: { nombre: true } } } } },
      }),
      prisma.organizacion.findUnique({ where: { id: orgId }, select: { nombre_organizacion: true } }),
    ]);
    if (!rev || rev.deleted_at || rev.organizacion_id !== orgId) return NextResponse.json({ error: "Revisión no encontrada" }, { status: 404 });

    const html = sanitizeDocumentHtml(buildActaHtml(
      rev,
      (rev.insumos_snapshot as unknown as Insumos | null),
      org?.nombre_organizacion ?? "",
    ));

    const obl = await prisma.documentoObligatorio.findUnique({ where: { codigo: "OBL-9.3" }, select: { id: true } });
    const nombre = `Acta de Revisión por la Dirección — ${rev.codigo}`;

    let documentoId = rev.documento_id;
    if (documentoId) {
      // Regenerar: snapshot al historial + actualizar contenido.
      const doc = await prisma.documento.findUnique({ where: { id: documentoId }, select: { version: true, nombre: true, estado: true, contenido: true } });
      await prisma.$transaction([
        prisma.documentoHistorial.create({
          data: { documento_id: documentoId, version: doc?.version ?? "1.0", nombre: doc?.nombre ?? nombre, estado: doc?.estado ?? "borrador", contenido: doc?.contenido ?? null, cambio_resumen: "Regeneración del acta de revisión por la dirección", usuario_id: session.user.userId },
        }),
        prisma.documento.update({ where: { id: documentoId }, data: { contenido: html, updated_at: new Date() } }),
      ]);
    } else {
      const existing = await prisma.documento.findMany({ where: { organizacion_id: orgId }, select: { codigo: true } });
      const codigo = nextCodeFromExisting("RDA", existing.map((dd) => dd.codigo));
      const doc = await prisma.documento.create({
        data: {
          organizacion_id: orgId, codigo, nombre, tipo: "Revisión por la Dirección", obligatorio: true,
          descripcion: `Acta de la revisión por la dirección ${rev.codigo} (cláusula 9.3).`,
          contenido: html, version: "1.0", estado: "borrador",
          ...(obl && { obligatorio_id: obl.id }),
        },
        select: { id: true },
      });
      documentoId = doc.id;
      await prisma.revisionDireccion.update({ where: { id }, data: { documento_id: documentoId } });
    }

    const documento = await prisma.documento.findUnique({ where: { id: documentoId }, select: { id: true, codigo: true, nombre: true } });
    return NextResponse.json({ documento }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo generar el acta");
  }
}
