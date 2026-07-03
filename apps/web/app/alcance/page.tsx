import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AppShell } from "@/app/_components/app-shell";
import { evaluarCumplimiento } from "@/lib/objetivos-medicion";
import { AlcanceClient } from "./alcance-client";

// HU10/HU11/HU13/HU14 — Alcance SGSI · Configuración
// HU15/HU16/HU17/HU18 — Objetivos del SGSI + aprobaciones

export default async function AlcancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "organizacion", "read")) {
    redirect("/dashboard?forbidden=organizacion:read");
  }

  const orgId = session.user.organizacion_id;
  const [org, sedes, procesos, factores, activos, procActivo, objetivos, aprobaciones, roles, usuarios] = await Promise.all([
    prisma.organizacion.findUnique({
      where: { id: orgId },
      select: { id: true, codigo: true, nombre_organizacion: true, alcance_sgsi: true },
    }),
    prisma.sede.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.proceso.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.factor.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.activoInformacion.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.procesoActivo.findMany({
      where: { proceso: { organizacion_id: orgId } },
      select: { proceso_id: true, activo_informacion_id: true },
    }),
    prisma.objetivoSgsi.findMany({
      where: { organizacion_id: orgId }, orderBy: { id: "asc" },
      include: { mediciones: { orderBy: [{ fecha_medicion: "desc" }, { id: "desc" }], take: 24, include: { registrado_por: { select: { nombre: true } } } } },
    }),
    prisma.aprobacion.findMany({
      where: { organizacion_id: orgId, tipo_entidad: "objetivo" },
      orderBy: { fecha_solicitud: "desc" },
    }),
    // Roles del SGSI (cláusula 5.3) — movido aquí desde Contexto: vive entre
    // "Configuración del alcance" y "Objetivos del SGSI".
    prisma.rolSgsi.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.usuario.findMany({ where: { organizacion_id: orgId, deleted_at: null }, select: { id: true, nombre: true, rol: true }, orderBy: { nombre: "asc" } }),
  ]);
  if (!org) redirect("/login");

  // P2 — enriquecer cada objetivo con sus mediciones (9.1) y el cumplimiento derivado.
  const objetivosOut = objetivos.map((o) => {
    const mediciones = o.mediciones.map((m) => ({
      id: m.id, valor: m.valor, fecha_medicion: m.fecha_medicion.toISOString().slice(0, 10),
      nota: m.nota, registrado_por: m.registrado_por?.nombre ?? null,
    }));
    const ultimo = mediciones[0] ?? null; // orden desc → el primero es el más reciente
    return {
      id: o.id, codigo: o.codigo, nombre: o.nombre, descripcion: o.descripcion,
      indicador: o.indicador, meta: o.meta, estado: o.estado,
      meta_valor: o.meta_valor, meta_operador: o.meta_operador, unidad: o.unidad, frecuencia: o.frecuencia,
      mediciones,
      ultimo_valor: ultimo?.valor ?? null, ultima_fecha: ultimo?.fecha_medicion ?? null,
      cumplimiento: evaluarCumplimiento(o.meta_valor, o.meta_operador, ultimo?.valor ?? null),
    };
  });

  const perms = {
    alcance_update:    can(session.user.rol, "organizacion", "update"),
    objetivo_create:   can(session.user.rol, "objetivo", "create"),
    objetivo_update:   can(session.user.rol, "objetivo", "update"),
    objetivo_delete:   can(session.user.rol, "objetivo", "delete"),
    aprobacion_create: can(session.user.rol, "aprobacion", "create"),
    aprobacion_approve:can(session.user.rol, "aprobacion", "approve"),
    rol_create:        can(session.user.rol, "rol_sgsi", "create"),
    rol_update:        can(session.user.rol, "rol_sgsi", "update"),
    rol_delete:        can(session.user.rol, "rol_sgsi", "delete"),
  };

  return (
    <AppShell current="alcance">
      <AlcanceClient
        sessionRol={session.user.rol}
        sessionNombre={session.user.nombre}
        org={org}
        sedes={sedes}
        procesos={procesos}
        factores={factores}
        activos={activos}
        procesoActivo={procActivo}
        objetivos={objetivosOut}
        aprobaciones={aprobaciones.map((a) => ({ ...a, entidad_id: Number(a.entidad_id), fecha_solicitud: a.fecha_solicitud.toISOString(), fecha_respuesta: a.fecha_respuesta?.toISOString() ?? null, fecha_vencimiento: a.fecha_vencimiento.toISOString().slice(0, 10) }))}
        roles={roles.map((r) => ({
          id: r.id, codigo: r.codigo, nombre: r.nombre, tipo: r.tipo, descripcion: r.descripcion,
          responsabilidades: r.responsabilidades, autoridades: r.autoridades, usuario_id: r.usuario_id, estado: r.estado,
        }))}
        usuarios={usuarios}
        perms={perms}
      />
    </AppShell>
  );
}
