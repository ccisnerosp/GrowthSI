// HU18 — Responder aprobación (aprobar/rechazar). Solo Gerencia.
// Triple capa anti-accidente:
//  · UI: doble-clic en fila → modal con comentario ≥ 20 chars + confirmación de identidad
//  · API: este endpoint exige comentario y aplica RBAC strict aprobacion:approve
//  · DB: registra fecha_respuesta + estado nuevo

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const respondSchema = z.object({
  decision:   z.enum(["aprobado", "rechazado"]),
  comentario: z.string().trim().min(20, "Mínimo 20 caracteres en el sustento de la decisión"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("aprobacion", "approve");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const parsed = await parseBody(req, respondSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  try {
    const existing = await prisma.aprobacion.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Aprobación no encontrada" }, { status: 404 });
    }
    if (existing.estado !== "pendiente") {
      return NextResponse.json({ error: `Esta aprobación ya fue ${existing.estado}` }, { status: 409 });
    }

    // Resolver la aprobación + actualizar la entidad relacionada en una transacción
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const aprobacion = await tx.aprobacion.update({
        where: { id },
        data: {
          estado: d.decision,
          comentario: `${existing.comentario}\n\n[${d.decision.toUpperCase()} por ${session.user.nombre} (${session.user.rol}) el ${now.toISOString()}]\n${d.comentario}`,
          fecha_respuesta: now,
        },
      });

      // Si se aprobó un objetivo, marcarlo como 'aprobado' en objetivo_sgsi
      if (d.decision === "aprobado" && existing.tipo_entidad === "objetivo") {
        await tx.objetivoSgsi.updateMany({
          where: { id: Number(existing.entidad_id), organizacion_id: session.user.organizacion_id },
          data: { estado: "aprobado" },
        });
      }

      // Documento: aprobado → 'aprobado'; rechazado → vuelve a 'borrador' para corregir.
      if (existing.tipo_entidad === "documento") {
        await tx.documento.updateMany({
          where: { id: Number(existing.entidad_id), organizacion_id: session.user.organizacion_id },
          data: { estado: d.decision === "aprobado" ? "aprobado" : "borrador" },
        });
      }

      return aprobacion;
    });

    return NextResponse.json({ aprobacion: { ...updated, entidad_id: Number(updated.entidad_id) } });
  } catch (e) {
    return apiError(e, "No se pudo procesar la aprobación");
  }
}
