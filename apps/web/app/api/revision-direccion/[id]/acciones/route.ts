// Revisión por la Dirección — crear acción de mejora (salida 9.3.3 → 10.1).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  descripcion: z.string().trim().min(3).max(2000),
  tipo: z.enum(["mejora", "cambio_control", "cambio_objetivo", "recurso", "politica", "otro"]).default("mejora"),
  responsable_usuario_id: z.coerce.number().int().positive().optional(),
  prioridad: z.enum(["alta", "media", "baja"]).default("media"),
  fecha_objetivo: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("revision_direccion", "update");
  if (error) return error;
  const revId = Number((await params).id);
  if (!Number.isInteger(revId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    const rev = await prisma.revisionDireccion.findUnique({ where: { id: revId }, select: { organizacion_id: true, deleted_at: true, estado: true } });
    if (!rev || rev.deleted_at || rev.organizacion_id !== orgId) return NextResponse.json({ error: "Revisión no encontrada" }, { status: 404 });
    if (rev.estado === "aprobada") return NextResponse.json({ error: "La revisión está aprobada; no admite cambios." }, { status: 409 });

    // El responsable, si se indica, debe pertenecer al tenant.
    if (d.responsable_usuario_id) {
      const u = await prisma.usuario.findFirst({ where: { id: d.responsable_usuario_id, organizacion_id: orgId }, select: { id: true } });
      if (!u) return NextResponse.json({ error: "Responsable no válido" }, { status: 400 });
    }

    const accion = await prisma.revisionDireccionAccion.create({
      data: {
        revision_direccion_id: revId,
        descripcion: d.descripcion,
        tipo: d.tipo,
        prioridad: d.prioridad,
        responsable_usuario_id: d.responsable_usuario_id ?? null,
        fecha_objetivo: d.fecha_objetivo ? new Date(d.fecha_objetivo) : null,
      },
    });
    return NextResponse.json({ accion }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la acción");
  }
}
