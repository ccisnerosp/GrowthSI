import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { sanitizeDocumentHtml } from "@/lib/sanitize-html";
import { AppShell } from "@/app/_components/app-shell";
import { DocumentoWorkspace } from "./documento-workspace";

// M2 — Página dedicada de un documento: render + edición + evidencia + aprobación.
export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "documento", "read")) redirect("/dashboard?forbidden=documento:read");

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const orgId = session.user.organizacion_id;

  const [doc, aprobaciones] = await Promise.all([
    prisma.documento.findUnique({ where: { id } }),
    prisma.aprobacion.findMany({
      where: { organizacion_id: orgId, tipo_entidad: "documento", entidad_id: id },
      orderBy: { fecha_solicitud: "desc" },
    }),
  ]);
  if (!doc || doc.organizacion_id !== orgId || doc.deleted_at) notFound();

  const perms = {
    update: can(session.user.rol, "documento", "update"),
    delete: can(session.user.rol, "documento", "delete"),
    aprobacion_create: can(session.user.rol, "aprobacion", "create"),
    aprobacion_approve: can(session.user.rol, "aprobacion", "approve"),
  };

  return (
    <AppShell current="documentos">
      <DocumentoWorkspace
        sessionRol={session.user.rol}
        sessionNombre={session.user.nombre}
        perms={perms}
        doc={{
          id: doc.id, codigo: doc.codigo, nombre: doc.nombre, tipo: doc.tipo,
          version: doc.version, estado: doc.estado, obligatorio: doc.obligatorio,
          descripcion: doc.descripcion,
          // HTML saneado en el servidor (seguro para editar y renderizar).
          contenido: sanitizeDocumentHtml(doc.contenido),
          archivo_nombre: doc.archivo_nombre,
          tiene_adjunto: doc.archivo_url != null,
        }}
        aprobacionesInicial={aprobaciones.map((a) => ({
          id: a.id, codigo: a.codigo, tipo_entidad: a.tipo_entidad, entidad_id: Number(a.entidad_id),
          comentario: a.comentario, estado: a.estado,
          fecha_solicitud: a.fecha_solicitud.toISOString(),
          fecha_respuesta: a.fecha_respuesta?.toISOString() ?? null,
          fecha_vencimiento: a.fecha_vencimiento.toISOString().slice(0, 10),
        }))}
      />
    </AppShell>
  );
}
