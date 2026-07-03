// M3 Riesgos — crear un riesgo manual ligado a un escenario del tenant.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";

const TRATAMIENTOS = ["mitigar", "transferir", "aceptar", "evitar"] as const;
const ESTADOS = ["generado", "tratamiento", "controlado", "aceptado"] as const;

const createSchema = z.object({
  escenario_riesgo_id:  z.coerce.number().int().positive(),
  nombre:               z.string().trim().min(2).max(200),
  descripcion:          z.string().trim().default(""),
  probabilidad_inicial: z.coerce.number().int().min(1).max(10),
  impacto_inicial:      z.coerce.number().int().min(1).max(10),
  probabilidad_actual:  z.coerce.number().int().min(1).max(10).optional(),
  impacto_actual:       z.coerce.number().int().min(1).max(10).optional(),
  tratamiento:          z.enum(TRATAMIENTOS).default("mitigar"),
  estado:               z.enum(ESTADOS).default("tratamiento"),
});

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("riesgo", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  try {
    // El escenario padre debe existir y pertenecer al tenant.
    const escenario = await prisma.escenarioRiesgo.findUnique({ where: { id: d.escenario_riesgo_id } });
    if (!escenario || escenario.organizacion_id !== session.user.organizacion_id || escenario.deleted_at) {
      return NextResponse.json({ error: "Escenario padre no encontrado" }, { status: 404 });
    }

    const codigos = await prisma.riesgo.findMany({ select: { codigo: true } });
    const codigo = nextCodeFromExisting("R", codigos.map((r) => r.codigo));

    const pi = d.probabilidad_inicial, ii = d.impacto_inicial;
    const pa = d.probabilidad_actual ?? pi, ia = d.impacto_actual ?? ii;

    // Un riesgo manual nace ya confirmado por su creador (no pasa por el flujo
    // 'generado'→aceptar de la IA), salvo que se cree explícitamente como 'generado'.
    const nace_aceptado = d.estado !== "generado";

    const riesgo = await prisma.riesgo.create({
      data: {
        escenario_riesgo_id: d.escenario_riesgo_id,
        codigo,
        nombre: d.nombre,
        descripcion: d.descripcion,
        probabilidad_inicial: pi, impacto_inicial: ii, nivel_inicial: pi * ii,
        tratamiento: d.tratamiento,
        probabilidad_actual: pa, impacto_actual: ia, nivel_actual: pa * ia,
        origen: "manual",
        estado: d.estado,
        ...(nace_aceptado && {
          aceptado_por_usuario_id: session.user.userId,
          aceptado_por_at: new Date(),
        }),
      },
    });
    return NextResponse.json({ riesgo }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el riesgo");
  }
}
