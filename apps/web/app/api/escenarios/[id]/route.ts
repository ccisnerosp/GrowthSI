// M3 Riesgos — editar / aceptar / descartar / eliminar un escenario.
//
// El flujo de aprobación ligero (decisión del PO): los escenarios sugeridos por
// IA nacen con estado='generado'. El rol permitido (CISO/Admin) los revisa y:
//   · aceptar   → estado 'activo' y sus riesgos 'generado' pasan a 'tratamiento'
//   · descartar → soft-delete del escenario y sus riesgos generados
// También admite edición puntual de campos antes de aceptar.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { deleteRecordVectors, vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForEscenario } from "@/lib/ai/chunk-text";

const DOMINIOS = ["tecnologico", "organizacional", "personas", "fisico"] as const;

const updateSchema = z.object({
  accion:         z.enum(["aceptar", "descartar"]).optional(),
  nombre:         z.string().trim().min(2).max(200).optional(),
  descripcion:    z.string().trim().optional(),
  amenaza:        z.string().trim().max(180).optional(),
  vulnerabilidad: z.string().trim().max(180).optional(),
  dominio:        z.enum(DOMINIOS).optional(),
  estado:         z.enum(["generado", "activo", "inactivo"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("escenario", "update");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    const existing = await prisma.escenarioRiesgo.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== orgId || existing.deleted_at) {
      return NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
    }

    // ── Descartar: soft-delete escenario + sus riesgos generados ──────────
    if (d.accion === "descartar") {
      await prisma.$transaction([
        prisma.riesgo.updateMany({
          where: { escenario_riesgo_id: id, estado: "generado", deleted_at: null },
          data: { deleted_at: new Date() },
        }),
        prisma.escenarioRiesgo.update({ where: { id }, data: { deleted_at: new Date() } }),
      ]);
      await deleteRecordVectors({ organizacion_id: orgId, tabla_origen: "escenario_riesgo", registro_origen_id: id });
      return NextResponse.json({ ok: true, descartado: true });
    }

    // ── Aceptar: escenario→activo, riesgos generados→tratamiento ──────────
    if (d.accion === "aceptar") {
      await prisma.$transaction([
        prisma.riesgo.updateMany({
          where: { escenario_riesgo_id: id, estado: "generado", deleted_at: null },
          data: { estado: "tratamiento", aceptado_por_usuario_id: session.user.userId, aceptado_por_at: new Date() },
        }),
        prisma.escenarioRiesgo.update({ where: { id }, data: { estado: "activo" } }),
      ]);
      const full = await prisma.escenarioRiesgo.findUnique({
        where: { id }, include: { riesgos: { where: { deleted_at: null }, orderBy: { id: "asc" } } },
      });
      return NextResponse.json({ escenario: full });
    }

    // ── Edición puntual de campos ─────────────────────────────────────────
    const escenario = await prisma.escenarioRiesgo.update({
      where: { id },
      data: {
        ...(d.nombre !== undefined && { nombre: d.nombre }),
        ...(d.descripcion !== undefined && { descripcion: d.descripcion }),
        ...(d.amenaza !== undefined && { amenaza: d.amenaza }),
        ...(d.vulnerabilidad !== undefined && { vulnerabilidad: d.vulnerabilidad }),
        ...(d.dominio !== undefined && { dominio: d.dominio }),
        ...(d.estado !== undefined && { estado: d.estado }),
      },
    });

    await vectorizeRecordSafe({
      organizacion_id: orgId,
      tabla_origen: "escenario_riesgo",
      registro_origen_id: escenario.id,
      campo_origen: "descripcion",
      chunk_texto: chunkForEscenario(escenario),
      metadata: { dominio: escenario.dominio, origen: escenario.origen },
    });

    return NextResponse.json({ escenario });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el escenario");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("escenario", "delete");
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const orgId = session.user.organizacion_id;
  try {
    const existing = await prisma.escenarioRiesgo.findUnique({ where: { id } });
    if (!existing || existing.organizacion_id !== orgId || existing.deleted_at) {
      return NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
    }
    await prisma.$transaction([
      prisma.riesgo.updateMany({
        where: { escenario_riesgo_id: id, deleted_at: null },
        data: { deleted_at: new Date() },
      }),
      prisma.escenarioRiesgo.update({ where: { id }, data: { deleted_at: new Date() } }),
    ]);
    await deleteRecordVectors({ organizacion_id: orgId, tabla_origen: "escenario_riesgo", registro_origen_id: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo eliminar el escenario");
  }
}
