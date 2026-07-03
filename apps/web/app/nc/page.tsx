import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AppShell } from "@/app/_components/app-shell";
import { NcClient } from "./nc-client";

// M4 — No Conformidades (cláusula 10.1/10.2): tablero kanban.
export default async function NcPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "nc", "read")) redirect("/dashboard?forbidden=nc:read");

  const orgId = session.user.organizacion_id;
  const [ncs, auditorias] = await Promise.all([
    prisma.noConformidad.findMany({
      where: { deleted_at: null, auditoria: { organizacion_id: orgId } },
      orderBy: { id: "asc" },
      include: { auditoria: { select: { codigo: true } } },
    }),
    prisma.auditoria.findMany({
      where: { organizacion_id: orgId, deleted_at: null },
      select: { id: true, codigo: true, nombre: true },
      orderBy: { fecha_inicio: "desc" },
    }),
  ]);

  const perms = {
    create: can(session.user.rol, "nc", "create"),
    update: can(session.user.rol, "nc", "update"),
    delete: can(session.user.rol, "nc", "delete"),
  };

  const ahora = new Date();
  const hoy = ahora.toISOString().slice(0, 10);
  const limite30 = new Date(ahora.getTime() + 30 * 86400_000).toISOString().slice(0, 10);

  return (
    <AppShell current="nc">
      <NcClient
        sessionRol={session.user.rol}
        hoy={hoy}
        limite30={limite30}
        perms={perms}
        auditorias={auditorias}
        ncInicial={ncs.map((n) => ({
          id: n.id, auditoria_id: n.auditoria_id, auditoria_codigo: n.auditoria.codigo,
          codigo: n.codigo, titulo: n.titulo, descripcion: n.descripcion,
          causa_raiz: n.causa_raiz, accion_correctiva: n.accion_correctiva,
          severidad: n.severidad, estado: n.estado,
          fecha_identificacion: n.fecha_identificacion.toISOString().slice(0, 10),
          fecha_vencimiento: n.fecha_vencimiento.toISOString().slice(0, 10),
          fecha_cierre: n.fecha_cierre ? n.fecha_cierre.toISOString().slice(0, 10) : null,
        }))}
      />
    </AppShell>
  );
}
