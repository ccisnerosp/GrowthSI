// Revisión por la Dirección (9.3) — listar y crear. Acoplado al módulo Auditorías.
// Al crear, ENSAMBLA los insumos 9.3.2 de forma determinista (sin IA) y los congela.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { computeInsumos } from "@/lib/revision-direccion-insumos";

export async function GET() {
  const { error, session } = await apiRequirePermission("revision_direccion", "read");
  if (error) return error;
  const orgId = session.user.organizacion_id;

  const revisiones = await prisma.revisionDireccion.findMany({
    where: { organizacion_id: orgId, deleted_at: null },
    orderBy: { fecha_revision: "desc" },
    select: {
      id: true, codigo: true, fecha_revision: true, periodo_desde: true, periodo_hasta: true,
      asistentes: true, estado: true, documento_id: true,
      conclusiones: true, insumos_snapshot: true,
      creado_por: { select: { nombre: true } },
      aprobado_por: { select: { nombre: true } }, aprobado_at: true,
      documento: { select: { id: true, codigo: true, nombre: true } },
      acciones: {
        orderBy: { id: "asc" },
        select: {
          id: true, descripcion: true, tipo: true, prioridad: true, estado: true,
          fecha_objetivo: true, fecha_cierre: true,
          responsable: { select: { nombre: true } },
        },
      },
    },
  });
  return NextResponse.json({ revisiones });
}

const createSchema = z.object({
  fecha_revision: z.string().optional(),
  periodo_desde: z.string().optional(),
  periodo_hasta: z.string().optional(),
  asistentes: z.string().trim().default(""),
});

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("revision_direccion", "create");
  if (error) return error;
  const orgId = session.user.organizacion_id;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  try {
    const hoy = new Date();
    const hasta = d.periodo_hasta ? new Date(d.periodo_hasta) : hoy;
    let desde: Date;
    if (d.periodo_desde) {
      desde = new Date(d.periodo_desde);
    } else {
      // Por defecto: desde la última revisión, o desde el inicio del proyecto.
      const ultima = await prisma.revisionDireccion.findFirst({
        where: { organizacion_id: orgId, deleted_at: null },
        orderBy: { fecha_revision: "desc" }, select: { fecha_revision: true },
      });
      if (ultima) {
        desde = ultima.fecha_revision;
      } else {
        const org = await prisma.organizacion.findUnique({ where: { id: orgId }, select: { inicio_proyecto: true } });
        desde = org?.inicio_proyecto ?? new Date(hoy.getFullYear(), 0, 1);
      }
    }

    const insumos = await computeInsumos(orgId, desde, hasta);

    const existentes = await prisma.revisionDireccion.findMany({ where: { organizacion_id: orgId }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("RD", existentes.map((r) => r.codigo));

    const revision = await prisma.revisionDireccion.create({
      data: {
        organizacion_id: orgId,
        codigo,
        fecha_revision: d.fecha_revision ? new Date(d.fecha_revision) : hoy,
        periodo_desde: desde,
        periodo_hasta: hasta,
        asistentes: d.asistentes,
        insumos_snapshot: insumos,
        estado: "borrador",
        creado_por_usuario_id: session.user.userId,
      },
      select: { id: true, codigo: true },
    });
    return NextResponse.json({ revision }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la revisión por la dirección");
  }
}
