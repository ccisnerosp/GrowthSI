// Perfil de la organización — GET (lectura) + PATCH (edición).
// Solo del tenant del usuario logueado (HU03 scoping).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const ESTADOS_SGSI = ["Diagnóstico", "Planificación", "Implementación", "Operación", "Certificado"] as const;

const updateSchema = z.object({
  nombre_organizacion:  z.string().trim().min(2).max(180).optional(),
  sector:               z.string().trim().min(1).max(100).optional(),
  numero_colaboradores: z.coerce.number().int().min(1).max(1_000_000).optional(),
  dominio:              z.string().trim().min(3).max(120).optional(),
  mision:               z.string().trim().min(10).optional(),
  vision:               z.string().trim().min(10).optional(),
  estado_sgsi:          z.enum(ESTADOS_SGSI).optional(),
  inicio_proyecto:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estado:               z.enum(["activo", "inactivo", "suspendido"]).optional(),
  // Criterios de riesgo (M3) — escalas de la matriz probabilidad × impacto (3×3 a 6×6).
  criterio_riesgo_p:    z.coerce.number().int().min(3).max(6).optional(),
  criterio_riesgo_i:    z.coerce.number().int().min(3).max(6).optional(),
  // Criterios de aceptación del riesgo (cláusula 6.1.2) — niveles (prob × impacto).
  apetito_riesgo:       z.coerce.number().int().min(1).max(100).nullable().optional(),
  tolerancia_riesgo:    z.coerce.number().int().min(1).max(100).nullable().optional(),
}).superRefine((d, ctx) => {
  if (d.apetito_riesgo != null && d.tolerancia_riesgo != null && d.apetito_riesgo > d.tolerancia_riesgo) {
    ctx.addIssue({ code: "custom", path: ["apetito_riesgo"], message: "El apetito no puede superar la tolerancia." });
  }
});

export async function GET() {
  const { error, session } = await apiRequirePermission("organizacion", "read");
  if (error) return error;
  const org = await prisma.organizacion.findUnique({
    where: { id: session.user.organizacion_id },
    include: { tenant: { select: { id: true, nombre: true, plan: true } } },
  });
  if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  return NextResponse.json({ organizacion: org });
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await apiRequirePermission("organizacion", "update");
  if (error) return error;
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const organizacion = await prisma.organizacion.update({
      where: { id: session.user.organizacion_id },
      data: {
        ...d,
        ...(d.inicio_proyecto && { inicio_proyecto: new Date(d.inicio_proyecto + "T00:00:00Z") }),
      },
    });
    return NextResponse.json({ organizacion });
  } catch (e) {
    return apiError(e, "No se pudo actualizar la organización");
  }
}
