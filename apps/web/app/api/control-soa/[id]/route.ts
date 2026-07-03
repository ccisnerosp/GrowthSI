// M3 SoA — editar / aceptar / descartar un control de la SoA.
// `id` = control_anexo_a_id (el control del catálogo). El control_soa se crea on-demand.
//
// Aprobación ligera de los controles sugeridos por IA (estado 'generado'):
//   · aceptar   → estado 'planificado' (aplica), el control queda en la SoA.
//   · descartar → elimina el control_soa sugerido y sus enlaces riesgo_control.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const ESTADOS = ["generado", "no_iniciado", "planificado", "parcial", "implementado", "no_aplica"] as const;

const updateSchema = z.object({
  accion:         z.enum(["aceptar", "descartar"]).optional(),
  aplica:         z.boolean().optional(),
  estado:         z.enum(ESTADOS).optional(),
  justificacion:  z.string().trim().max(4000).optional(),
  evidencia:      z.string().trim().max(2000).optional(),
  // Documento del módulo Documentos que sustenta el control (null = quitar evidencia).
  evidencia_documento_id: z.number().int().positive().nullable().optional(),
  observaciones:  z.string().trim().max(2000).optional(),
  fecha_revision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Responsable de la implementación (cláusula 5.3): rol del SGSI + titular.
  rol_sgsi_id:            z.number().int().positive().nullable().optional(),
  responsable_usuario_id: z.number().int().positive().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("control_soa", "update");
  if (error) return error;
  const controlAnexoAId = Number((await params).id);
  if (!Number.isInteger(controlAnexoAId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    const control = await prisma.controlAnexoA.findUnique({ where: { id: controlAnexoAId } });
    if (!control) return NextResponse.json({ error: "Control no encontrado" }, { status: 404 });

    const whereUnique = { control_anexo_a_id_organizacion_id: { control_anexo_a_id: controlAnexoAId, organizacion_id: orgId } };

    // ── Aceptar / descartar (solo aplican a un control_soa existente) ─────
    if (d.accion) {
      const existing = await prisma.controlSoa.findUnique({ where: whereUnique });
      if (!existing) return NextResponse.json({ error: "Este control aún no está en la SoA" }, { status: 404 });

      if (d.accion === "descartar") {
        await prisma.$transaction([
          prisma.riesgoControl.deleteMany({ where: { control_soa_id: existing.id } }),
          prisma.controlSoa.delete({ where: { id: existing.id } }),
        ]);
        return NextResponse.json({ ok: true, descartado: true });
      }
      // aceptar
      const soa = await prisma.controlSoa.update({
        where: { id: existing.id },
        data: { estado: "planificado", aplica: true },
      });
      return NextResponse.json({ soa });
    }

    // El documento de evidencia debe pertenecer al tenant.
    if (typeof d.evidencia_documento_id === "number") {
      const doc = await prisma.documento.findFirst({
        where: { id: d.evidencia_documento_id, organizacion_id: orgId, deleted_at: null },
        select: { id: true },
      });
      if (!doc) return NextResponse.json({ error: "Documento de evidencia no encontrado" }, { status: 404 });
    }
    // El rol y el usuario responsable deben pertenecer al tenant.
    if (typeof d.rol_sgsi_id === "number") {
      const rol = await prisma.rolSgsi.findFirst({ where: { id: d.rol_sgsi_id, organizacion_id: orgId }, select: { id: true } });
      if (!rol) return NextResponse.json({ error: "Rol del SGSI no encontrado" }, { status: 404 });
    }
    if (typeof d.responsable_usuario_id === "number") {
      const u = await prisma.usuario.findFirst({ where: { id: d.responsable_usuario_id, organizacion_id: orgId, deleted_at: null }, select: { id: true } });
      if (!u) return NextResponse.json({ error: "Usuario responsable no encontrado" }, { status: 404 });
    }

    // ── Edición / alta manual (upsert por control + tenant) ───────────────
    const fechaRev = d.fecha_revision ? new Date(d.fecha_revision + "T00:00:00Z") : new Date();
    const soa = await prisma.controlSoa.upsert({
      where: whereUnique,
      update: {
        ...(d.aplica !== undefined && { aplica: d.aplica }),
        ...(d.estado !== undefined && { estado: d.estado }),
        ...(d.justificacion !== undefined && { justificacion: d.justificacion }),
        ...(d.evidencia !== undefined && { evidencia: d.evidencia }),
        ...(d.evidencia_documento_id !== undefined && { evidencia_documento_id: d.evidencia_documento_id }),
        ...(d.observaciones !== undefined && { observaciones: d.observaciones }),
        ...(d.fecha_revision !== undefined && { fecha_revision: fechaRev }),
        ...(d.rol_sgsi_id !== undefined && { rol_sgsi_id: d.rol_sgsi_id }),
        ...(d.responsable_usuario_id !== undefined && { responsable_usuario_id: d.responsable_usuario_id }),
      },
      create: {
        control_anexo_a_id: controlAnexoAId,
        organizacion_id: orgId,
        aplica: d.aplica ?? true,
        estado: d.estado ?? "no_iniciado",
        justificacion: d.justificacion ?? "",
        evidencia: d.evidencia ?? "",
        evidencia_documento_id: d.evidencia_documento_id ?? null,
        observaciones: d.observaciones ?? "",
        fecha_revision: fechaRev,
        origen: "manual",
        rol_sgsi_id: d.rol_sgsi_id ?? null,
        responsable_usuario_id: d.responsable_usuario_id ?? null,
      },
    });
    return NextResponse.json({ soa });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el control de la SoA");
  }
}
