// P2 — Eliminar una medición de objetivo (cláusula 9.1).

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { apiError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("objetivo", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const m = await prisma.medicionObjetivo.findUnique({
      where: { id }, include: { objetivo: { select: { organizacion_id: true } } },
    });
    if (!m || m.objetivo.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Medición no encontrada" }, { status: 404 });
    }
    await prisma.medicionObjetivo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar la medición");
  }
}
