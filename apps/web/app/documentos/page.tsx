import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AppShell } from "@/app/_components/app-shell";
import { computeCobertura, resumenCobertura, type DocLink } from "@/lib/obligatorios";
import { revisionPendiente } from "@/lib/alcance-revision";
import { AlcanceBanner } from "@/app/_components/alcance-banner";
import { DocumentosClient } from "./documentos-client";

// M2 Documentos — HU19 listar, HU20 registrar, HU21 ver/editar, HU22 actualizar,
// HU23 generar plantilla IA, HU24 historial + catálogo de obligatorios (ISO 27001).
export default async function DocumentosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "documento", "read")) {
    redirect("/dashboard?forbidden=documento:read");
  }

  const orgId = session.user.organizacion_id;
  const [documentos, aprobaciones, catalogo, org, soaAplican, objetivos, audCount, ncCount, riesgoCount] = await Promise.all([
    prisma.documento.findMany({
      where: { organizacion_id: orgId, deleted_at: null },
      select: {
        id: true, codigo: true, nombre: true, tipo: true, obligatorio: true, obligatorio_id: true,
        descripcion: true, version: true, estado: true,
        created_at: true, updated_at: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.aprobacion.findMany({
      where: { organizacion_id: orgId, tipo_entidad: "documento" },
      orderBy: { fecha_solicitud: "desc" },
    }),
    prisma.documentoObligatorio.findMany({ orderBy: { orden: "asc" } }),
    prisma.organizacion.findUnique({ where: { id: orgId }, select: { alcance_sgsi: true } }),
    prisma.controlSoa.count({ where: { organizacion_id: orgId, aplica: true } }),
    prisma.objetivoSgsi.count({ where: { organizacion_id: orgId } }),
    prisma.auditoria.count({ where: { organizacion_id: orgId, deleted_at: null } }),
    prisma.noConformidad.count({ where: { deleted_at: null, auditoria: { organizacion_id: orgId } } }),
    prisma.riesgo.count({ where: { deleted_at: null, estado: { not: "generado" }, escenario: { organizacion_id: orgId } } }),
  ]);

  // Cobertura del catálogo de información documentada obligatoria.
  const docsByItem = new Map<number, DocLink>();
  for (const dd of documentos) if (dd.obligatorio_id != null && !docsByItem.has(dd.obligatorio_id)) {
    docsByItem.set(dd.obligatorio_id, { id: dd.id, codigo: dd.codigo, nombre: dd.nombre, estado: dd.estado });
  }
  const flags = {
    alcance: !!(org?.alcance_sgsi && org.alcance_sgsi.trim().length > 0),
    soa: soaAplican > 0, objetivos: objetivos > 0, auditorias: audCount > 0, nc: ncCount > 0, riesgos: riesgoCount > 0,
  };
  const cobertura = computeCobertura(catalogo, docsByItem, flags);
  const resumen = resumenCobertura(cobertura);

  const perms = {
    create: can(session.user.rol, "documento", "create"),
    update: can(session.user.rol, "documento", "update"),
    delete: can(session.user.rol, "documento", "delete"),
    aprobacion_create: can(session.user.rol, "aprobacion", "create"),
    aprobacion_approve: can(session.user.rol, "aprobacion", "approve"),
  };

  const rev = await revisionPendiente(orgId, "documentos");
  const canReview = can(session.user.rol, "organizacion", "update");

  return (
    <AppShell current="documentos">
      {rev.pendiente && rev.modificadoAt && (
        <AlcanceBanner
          modulo="documentos"
          modificadoAt={rev.modificadoAt}
          canReview={canReview}
          nota="Verifica que la declaración de alcance, las políticas y los documentos obligatorios sigan alineados al nuevo alcance (ISO 27001 · 7.5)."
        />
      )}
      <DocumentosClient
        sessionRol={session.user.rol}
        cobertura={cobertura}
        resumen={resumen}
        documentosInicial={documentos.map((d) => ({
          ...d,
          created_at: d.created_at?.toISOString() ?? null,
          updated_at: d.updated_at?.toISOString() ?? null,
        }))}
        aprobacionesInicial={aprobaciones.map((a) => ({
          ...a,
          entidad_id: Number(a.entidad_id),
          fecha_solicitud: a.fecha_solicitud.toISOString(),
          fecha_respuesta: a.fecha_respuesta?.toISOString() ?? null,
          fecha_vencimiento: a.fecha_vencimiento.toISOString().slice(0, 10),
        }))}
        perms={perms}
      />
    </AppShell>
  );
}
