// HU24 — Auditor consulta el registro de cambios de un documento.

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("documento", "read");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  // Verificar que el documento pertenece al tenant (HU03 scoping)
  const doc = await prisma.documento.findUnique({ where: { id }, select: { organizacion_id: true } });
  if (!doc || doc.organizacion_id !== session.user.organizacion_id) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const historial = await prisma.documentoHistorial.findMany({
    where: { documento_id: id },
    orderBy: { created_at: "desc" },
    include: { usuario: { select: { nombre: true, correo: true } } },
  });

  return NextResponse.json({
    historial: historial.map((h) => ({
      id: Number(h.id),
      version: h.version,
      nombre: h.nombre,
      estado: h.estado,
      cambio_resumen: h.cambio_resumen,
      usuario: h.usuario ? { nombre: h.usuario.nombre, correo: h.usuario.correo } : null,
      created_at: h.created_at.toISOString(),
    })),
  });
}
