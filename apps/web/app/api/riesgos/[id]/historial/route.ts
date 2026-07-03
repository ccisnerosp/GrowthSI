// M3 Riesgos — registro de reevaluaciones del P·I actual de un riesgo.

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("riesgo", "read");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  // El riesgo debe pertenecer al tenant (scoping vía escenario padre).
  const riesgo = await prisma.riesgo.findUnique({
    where: { id }, include: { escenario: { select: { organizacion_id: true } } },
  });
  if (!riesgo || riesgo.escenario.organizacion_id !== session.user.organizacion_id) {
    return NextResponse.json({ error: "Riesgo no encontrado" }, { status: 404 });
  }

  const historial = await prisma.riesgoHistorial.findMany({
    where: { riesgo_id: id },
    orderBy: { created_at: "desc" },
    include: { usuario: { select: { nombre: true, correo: true } } },
  });

  return NextResponse.json({
    historial: historial.map((h) => ({
      id: Number(h.id),
      probabilidad_anterior: h.probabilidad_anterior,
      impacto_anterior: h.impacto_anterior,
      nivel_anterior: h.nivel_anterior,
      probabilidad_nueva: h.probabilidad_nueva,
      impacto_nueva: h.impacto_nueva,
      nivel_nuevo: h.nivel_nuevo,
      justificacion: h.justificacion,
      usuario: h.usuario ? { nombre: h.usuario.nombre, correo: h.usuario.correo } : null,
      created_at: h.created_at.toISOString(),
    })),
  });
}
