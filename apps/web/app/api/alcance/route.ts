// HU10/HU13/HU14 — GET (visualizar) y PATCH (registrar/editar) del alcance del SGSI.
// Modifica organizacion.alcance_sgsi + toggles sede.incluido_alcance + proceso.incluido_alcance.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const patchSchema = z.object({
  alcance_sgsi:    z.string().trim().min(0).max(8000).optional(),
  sedes_alcance:   z.array(z.object({ id: z.number().int(), incluido: z.boolean() })).optional(),
  procesos_alcance: z.array(z.object({ id: z.number().int(), incluido: z.boolean() })).optional(),
  factores_alcance: z.array(z.object({ id: z.number().int(), incluido: z.boolean() })).optional(),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("organizacion", "read");
  if (error) return error;
  const orgId = session.user.organizacion_id;

  const [org, sedes, procesos, activos, procActivo, factores] = await Promise.all([
    prisma.organizacion.findUnique({ where: { id: orgId }, select: { id: true, codigo: true, alcance_sgsi: true } }),
    prisma.sede.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.proceso.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.activoInformacion.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
    prisma.procesoActivo.findMany({
      where: { proceso: { organizacion_id: orgId } },
      include: { activo: { select: { id: true, codigo: true, nombre: true } }, proceso: { select: { id: true, incluido_alcance: true } } },
    }),
    prisma.factor.findMany({ where: { organizacion_id: orgId }, orderBy: { id: "asc" } }),
  ]);

  return NextResponse.json({ organizacion: org, sedes, procesos, activos, procesoActivo: procActivo, factores });
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await apiRequirePermission("organizacion", "update");
  if (error) return error;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;
  try {
    // ¿Cambió realmente el alcance? (texto o inclusión de sedes/procesos/factores).
    // Solo entonces sellamos alcance_modificado_at → evita avisos por guardados no-op.
    const org = await prisma.organizacion.findUnique({ where: { id: orgId }, select: { alcance_sgsi: true } });
    let scopeChanged = d.alcance_sgsi !== undefined && (d.alcance_sgsi ?? "") !== (org?.alcance_sgsi ?? "");

    if (!scopeChanged && d.sedes_alcance?.length) {
      const cur = await prisma.sede.findMany({ where: { organizacion_id: orgId, id: { in: d.sedes_alcance.map((s) => s.id) } }, select: { id: true, incluido_alcance: true } });
      const m = new Map(cur.map((c) => [c.id, c.incluido_alcance]));
      scopeChanged = d.sedes_alcance.some((s) => m.get(s.id) !== s.incluido);
    }
    if (!scopeChanged && d.procesos_alcance?.length) {
      const cur = await prisma.proceso.findMany({ where: { organizacion_id: orgId, id: { in: d.procesos_alcance.map((p) => p.id) } }, select: { id: true, incluido_alcance: true } });
      const m = new Map(cur.map((c) => [c.id, c.incluido_alcance]));
      scopeChanged = d.procesos_alcance.some((p) => m.get(p.id) !== p.incluido);
    }
    if (!scopeChanged && d.factores_alcance?.length) {
      const cur = await prisma.factor.findMany({ where: { organizacion_id: orgId, id: { in: d.factores_alcance.map((f) => f.id) } }, select: { id: true, incluido_alcance: true } });
      const m = new Map(cur.map((c) => [c.id, c.incluido_alcance]));
      scopeChanged = d.factores_alcance.some((f) => m.get(f.id) !== f.incluido);
    }

    const ops: Promise<unknown>[] = [];
    // Org: alcance_sgsi y/o sello de modificación en una sola escritura.
    const orgData: { alcance_sgsi?: string; alcance_modificado_at?: Date } = {};
    if (d.alcance_sgsi !== undefined) orgData.alcance_sgsi = d.alcance_sgsi;
    if (scopeChanged) orgData.alcance_modificado_at = new Date();
    if (Object.keys(orgData).length > 0) {
      ops.push(prisma.organizacion.update({ where: { id: orgId }, data: orgData }));
    }
    if (d.sedes_alcance) {
      for (const s of d.sedes_alcance) {
        ops.push(prisma.sede.updateMany({
          where: { id: s.id, organizacion_id: orgId },
          data: { incluido_alcance: s.incluido },
        }));
      }
    }
    if (d.procesos_alcance) {
      for (const p of d.procesos_alcance) {
        ops.push(prisma.proceso.updateMany({
          where: { id: p.id, organizacion_id: orgId },
          data: { incluido_alcance: p.incluido },
        }));
      }
    }
    if (d.factores_alcance) {
      for (const f of d.factores_alcance) {
        ops.push(prisma.factor.updateMany({
          where: { id: f.id, organizacion_id: orgId },
          data: { incluido_alcance: f.incluido },
        }));
      }
    }
    await Promise.all(ops);
    return NextResponse.json({ ok: true, alcance_modificado: scopeChanged });
  } catch (e) {
    return apiError(e, "No se pudo actualizar el alcance");
  }
}
