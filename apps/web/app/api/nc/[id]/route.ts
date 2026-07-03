// M4 — editar / mover (kanban) / eliminar (soft) una No Conformidad.
// Al pasar a 'cerrada' se sella fecha_cierre; al reabrir se limpia.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const SEVERIDAD = ["menor", "mayor", "critica"] as const;
const ESTADOS = ["identificada", "analisis", "plan", "ejecucion", "cerrada"] as const;
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const updateSchema = z.object({
  titulo:            z.string().trim().min(2).max(220).optional(),
  descripcion:       z.string().trim().optional(),
  causa_raiz:        z.string().trim().optional(),
  accion_correctiva: z.string().trim().optional(),
  severidad:         z.enum(SEVERIDAD).optional(),
  estado:            z.enum(ESTADOS).optional(),
  fecha_vencimiento: DATE.optional(),
});

type Ctx = { params: Promise<{ id: string }> };
const d2 = (s: string) => new Date(s + "T00:00:00Z");

async function loadOwned(id: number, orgId: number) {
  const nc = await prisma.noConformidad.findUnique({ where: { id }, include: { auditoria: { select: { organizacion_id: true } } } });
  if (!nc || nc.deleted_at || nc.auditoria.organizacion_id !== orgId) return null;
  return nc;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("nc", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const prev = await loadOwned(id, session.user.organizacion_id);
    if (!prev) return NextResponse.json({ error: "No conformidad no encontrada" }, { status: 404 });

    // fecha_cierre: se sella al cerrar; se limpia si vuelve a un estado abierto.
    let fechaCierre: Date | null | undefined;
    if (d.estado !== undefined) {
      if (d.estado === "cerrada") fechaCierre = prev.fecha_cierre ?? new Date();
      else fechaCierre = null;
    }

    const nc = await prisma.noConformidad.update({
      where: { id },
      data: {
        ...(d.titulo !== undefined && { titulo: d.titulo }),
        ...(d.descripcion !== undefined && { descripcion: d.descripcion }),
        ...(d.causa_raiz !== undefined && { causa_raiz: d.causa_raiz }),
        ...(d.accion_correctiva !== undefined && { accion_correctiva: d.accion_correctiva }),
        ...(d.severidad !== undefined && { severidad: d.severidad }),
        ...(d.estado !== undefined && { estado: d.estado }),
        ...(d.fecha_vencimiento !== undefined && { fecha_vencimiento: d2(d.fecha_vencimiento) }),
        ...(fechaCierre !== undefined && { fecha_cierre: fechaCierre }),
      },
    });
    return NextResponse.json({ nc });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la no conformidad");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("nc", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    if (!await loadOwned(id, session.user.organizacion_id)) return NextResponse.json({ error: "No conformidad no encontrada" }, { status: 404 });
    await prisma.noConformidad.update({ where: { id }, data: { deleted_at: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la no conformidad");
  }
}
