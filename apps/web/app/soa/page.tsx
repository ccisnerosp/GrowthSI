import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AppShell } from "@/app/_components/app-shell";
import { revisionPendiente } from "@/lib/alcance-revision";
import { AlcanceBanner } from "@/app/_components/alcance-banner";
import { SoaClient } from "./soa-client";

// M3 SoA — Declaración de Aplicabilidad (Cláusula 6.1.3.d · 93 controles Anexo A).
export default async function SoaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "control_soa", "read")) {
    redirect("/dashboard?forbidden=control_soa:read");
  }

  const orgId = session.user.organizacion_id;
  const [org, catalogo, soaRows, documentos, riesgosSinCobertura, roles, usuarios] = await Promise.all([
    prisma.organizacion.findUnique({ where: { id: orgId }, select: { nombre_organizacion: true } }),
    prisma.controlAnexoA.findMany({
      select: { id: true, codigo: true, nombre: true, dominio: true, descripcion: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.controlSoa.findMany({
      where: { organizacion_id: orgId },
      select: {
        id: true, control_anexo_a_id: true, aplica: true, estado: true,
        justificacion: true, evidencia: true, observaciones: true,
        fecha_revision: true, origen: true, justificacion_ia: true,
        evidencia_documento_id: true, rol_sgsi_id: true, responsable_usuario_id: true,
        evidencia_documento: { select: { id: true, codigo: true, nombre: true } },
        rol_sgsi: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
        riesgos: { select: { riesgo: { select: { codigo: true } } } },
        actividades: {
          orderBy: { orden: "asc" },
          select: {
            id: true, descripcion: true, estado: true, fecha_objetivo: true,
            responsable_usuario_id: true, responsable: { select: { nombre: true } },
          },
        },
      },
    }),
    prisma.documento.findMany({
      where: { organizacion_id: orgId, deleted_at: null },
      select: { id: true, codigo: true, nombre: true },
      orderBy: { id: "asc" },
    }),
    // Riesgos 'mitigar' revisados SIN ningún control enlazado (brecha de cobertura).
    prisma.riesgo.findMany({
      where: {
        deleted_at: null, tratamiento: "mitigar", estado: { not: "generado" },
        escenario: { organizacion_id: orgId }, controles: { none: {} },
      },
      select: { codigo: true, nombre: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.rolSgsi.findMany({ where: { organizacion_id: orgId, estado: "activo" }, select: { id: true, codigo: true, nombre: true }, orderBy: { codigo: "asc" } }),
    prisma.usuario.findMany({ where: { organizacion_id: orgId, deleted_at: null }, select: { id: true, nombre: true, rol: true }, orderBy: { nombre: "asc" } }),
  ]);
  if (!org) redirect("/login");

  const soaByControl = new Map(soaRows.map((s) => [s.control_anexo_a_id, s]));
  const controles = catalogo.map((c) => {
    const s = soaByControl.get(c.id);
    return {
      control: c,
      soa: s
        ? {
            id: s.id, aplica: s.aplica, estado: s.estado,
            justificacion: s.justificacion, evidencia: s.evidencia, observaciones: s.observaciones,
            fecha_revision: s.fecha_revision.toISOString().slice(0, 10),
            origen: s.origen, justificacion_ia: s.justificacion_ia,
            evidencia_documento_id: s.evidencia_documento_id,
            evidencia_documento: s.evidencia_documento,
            rol_sgsi_id: s.rol_sgsi_id,
            responsable_usuario_id: s.responsable_usuario_id,
            rol_sgsi: s.rol_sgsi,
            responsable: s.responsable,
          }
        : null,
      riesgos: s ? s.riesgos.map((r) => r.riesgo.codigo) : [],
      actividades: s
        ? s.actividades.map((a) => ({
            id: a.id, descripcion: a.descripcion, estado: a.estado,
            fecha_objetivo: a.fecha_objetivo ? a.fecha_objetivo.toISOString().slice(0, 10) : null,
            responsable_usuario_id: a.responsable_usuario_id,
            responsable_nombre: a.responsable?.nombre ?? null,
          }))
        : [],
    };
  });

  const perms = {
    create: can(session.user.rol, "control_soa", "create"),
    update: can(session.user.rol, "control_soa", "update"),
    delete: can(session.user.rol, "control_soa", "delete"),
  };

  const rev = await revisionPendiente(orgId, "controles");
  const canReview = can(session.user.rol, "organizacion", "update");

  return (
    <AppShell current="soa">
      {rev.pendiente && rev.modificadoAt && (
        <AlcanceBanner
          modulo="controles"
          modificadoAt={rev.modificadoAt}
          canReview={canReview}
          nota="Revisa la aplicabilidad de los controles: lo que entra/sale del alcance puede cambiar qué controles aplican (ISO 27001 · 6.1.3)."
        />
      )}
      <SoaClient
        sessionRol={session.user.rol}
        orgNombre={org.nombre_organizacion}
        controlesInicial={controles}
        documentos={documentos}
        riesgosSinCobertura={riesgosSinCobertura}
        roles={roles}
        usuarios={usuarios}
        perms={perms}
      />
    </AppShell>
  );
}
