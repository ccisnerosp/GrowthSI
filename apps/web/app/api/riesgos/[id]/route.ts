// M3 Riesgos — editar / aceptar / descartar / eliminar un riesgo.
// 'aceptar' lleva un riesgo sugerido por IA (estado 'generado') a 'tratamiento'.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const TRATAMIENTOS = ["mitigar", "transferir", "aceptar", "evitar"] as const;
const ESTADOS = ["generado", "tratamiento", "controlado", "aceptado"] as const;

const updateSchema = z.object({
  accion:               z.enum(["aceptar", "descartar"]).optional(),
  nombre:               z.string().trim().min(2).max(200).optional(),
  descripcion:          z.string().trim().optional(),
  probabilidad_inicial: z.coerce.number().int().min(1).max(10).optional(),
  impacto_inicial:      z.coerce.number().int().min(1).max(10).optional(),
  probabilidad_actual:  z.coerce.number().int().min(1).max(10).optional(),
  impacto_actual:       z.coerce.number().int().min(1).max(10).optional(),
  tratamiento:          z.enum(TRATAMIENTOS).optional(),
  estado:               z.enum(ESTADOS).optional(),
  // Obligatoria cuando cambia el P·I actual (reevaluación → historial).
  justificacion:        z.string().trim().min(20).max(2000).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(id: number, orgId: number) {
  const riesgo = await prisma.riesgo.findUnique({
    where: { id }, include: { escenario: { select: { organizacion_id: true } } },
  });
  if (!riesgo || riesgo.deleted_at || riesgo.escenario.organizacion_id !== orgId) return null;
  return riesgo;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("riesgo", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    const existing = await loadOwned(id, orgId);
    if (!existing) return NextResponse.json({ error: "Riesgo no encontrado" }, { status: 404 });

    if (d.accion === "descartar") {
      await prisma.riesgo.update({ where: { id }, data: { deleted_at: new Date() } });
      return NextResponse.json({ ok: true, descartado: true });
    }
    if (d.accion === "aceptar") {
      // Revisión previa a la aceptación: el usuario confirma o ajusta el P·I
      // inicial sugerido por la IA. Como el riesgo todavía no se trata, el P·I
      // actual reespeja al inicial. Se sella quién lo aceptó.
      const pi = d.probabilidad_inicial ?? existing.probabilidad_inicial;
      const ii = d.impacto_inicial ?? existing.impacto_inicial;
      const riesgo = await prisma.riesgo.update({
        where: { id },
        data: {
          estado: "tratamiento",
          probabilidad_inicial: pi, impacto_inicial: ii, nivel_inicial: pi * ii,
          probabilidad_actual: pi, impacto_actual: ii, nivel_actual: pi * ii,
          aceptado_por_usuario_id: session.user.userId,
          aceptado_por_at: new Date(),
        },
      });
      return NextResponse.json({ riesgo });
    }

    // Recalcular niveles si cambian probabilidad/impacto.
    const pi = d.probabilidad_inicial ?? existing.probabilidad_inicial;
    const ii = d.impacto_inicial ?? existing.impacto_inicial;
    const pa = d.probabilidad_actual ?? existing.probabilidad_actual;
    const ia = d.impacto_actual ?? existing.impacto_actual;
    const nivelNuevo = pa * ia;

    const data = {
      ...(d.nombre !== undefined && { nombre: d.nombre }),
      ...(d.descripcion !== undefined && { descripcion: d.descripcion }),
      ...(d.tratamiento !== undefined && { tratamiento: d.tratamiento }),
      ...(d.estado !== undefined && { estado: d.estado }),
      probabilidad_inicial: pi, impacto_inicial: ii, nivel_inicial: pi * ii,
      probabilidad_actual: pa, impacto_actual: ia, nivel_actual: nivelNuevo,
    };

    // Cambio del P·I ACTUAL = reevaluación del riesgo → justificación obligatoria
    // + registro en el historial (autor + valores antes/después).
    const actualChanged = pa !== existing.probabilidad_actual || ia !== existing.impacto_actual;
    if (actualChanged) {
      if (!d.justificacion) {
        return NextResponse.json(
          { error: "Para actualizar el P·I actual debes registrar una justificación (mínimo 20 caracteres)." },
          { status: 400 },
        );
      }
      const [riesgo] = await prisma.$transaction([
        prisma.riesgo.update({ where: { id }, data }),
        prisma.riesgoHistorial.create({
          data: {
            riesgo_id: id,
            probabilidad_anterior: existing.probabilidad_actual,
            impacto_anterior: existing.impacto_actual,
            nivel_anterior: existing.nivel_actual,
            probabilidad_nueva: pa,
            impacto_nueva: ia,
            nivel_nuevo: nivelNuevo,
            justificacion: d.justificacion,
            usuario_id: session.user.userId,
          },
        }),
      ]);
      return NextResponse.json({ riesgo });
    }

    const riesgo = await prisma.riesgo.update({ where: { id }, data });
    return NextResponse.json({ riesgo });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el riesgo");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("riesgo", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const existing = await loadOwned(id, session.user.organizacion_id);
    if (!existing) return NextResponse.json({ error: "Riesgo no encontrado" }, { status: 404 });
    await prisma.riesgo.update({ where: { id }, data: { deleted_at: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el riesgo");
  }
}
