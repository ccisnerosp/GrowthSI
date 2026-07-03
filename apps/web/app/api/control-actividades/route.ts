// Actividades de implementación de un control de la SoA (plan de tareas, #2).
// Crear una actividad. El control debe existir ya en la SoA del tenant.
// Permiso: control_soa:update (misma gobernanza que editar el control).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const createSchema = z.object({
  control_anexo_a_id:     z.number().int().positive(),
  descripcion:            z.string().trim().min(2).max(500),
  responsable_usuario_id: z.number().int().positive().nullable().optional(),
  fecha_objetivo:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("control_soa", "update");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    // El control debe estar en la SoA del tenant (las actividades cuelgan de él).
    const soa = await prisma.controlSoa.findUnique({
      where: { control_anexo_a_id_organizacion_id: { control_anexo_a_id: d.control_anexo_a_id, organizacion_id: orgId } },
      select: { id: true },
    });
    if (!soa) return NextResponse.json({ error: "Agrega el control a la SoA antes de planificar actividades." }, { status: 400 });

    if (typeof d.responsable_usuario_id === "number") {
      const u = await prisma.usuario.findFirst({ where: { id: d.responsable_usuario_id, organizacion_id: orgId, deleted_at: null }, select: { id: true } });
      if (!u) return NextResponse.json({ error: "Usuario responsable no encontrado" }, { status: 404 });
    }

    const ultima = await prisma.controlActividad.findFirst({
      where: { control_soa_id: soa.id }, orderBy: { orden: "desc" }, select: { orden: true },
    });
    const actividad = await prisma.controlActividad.create({
      data: {
        control_soa_id: soa.id,
        descripcion: d.descripcion,
        responsable_usuario_id: d.responsable_usuario_id ?? null,
        fecha_objetivo: d.fecha_objetivo ? new Date(d.fecha_objetivo + "T00:00:00Z") : null,
        orden: (ultima?.orden ?? 0) + 1,
      },
    });
    return NextResponse.json({ actividad }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la actividad");
  }
}
