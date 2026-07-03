// M4 — HU: programa de auditorías (cláusula 9.2). Crear auditoría.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

const TIPOS = ["Interna", "Externa", "Tercero"] as const;
const ESTADOS = ["planificada", "en-curso", "completada"] as const;
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z.object({
  nombre:            z.string().trim().min(2).max(200),
  tipo:              z.enum(TIPOS),
  alcance:           z.string().trim().min(2),
  fecha_inicio:      DATE,
  fecha_fin:         DATE,
  fecha_vencimiento: DATE,
  estado:            z.enum(ESTADOS).default("planificada"),
});

const d2 = (s: string) => new Date(s + "T00:00:00Z");

/** Código por año: AU-YYYY-NN (correlativo dentro del año, global por unicidad). */
function nextAuditoriaCodigo(existing: string[], year: number): string {
  const re = new RegExp(`^AU-${year}-(\\d+)$`);
  let max = 0;
  for (const c of existing) { const m = c?.match(re); if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; } }
  return `AU-${year}-${String(max + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("auditoria", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const existing = await prisma.auditoria.findMany({ select: { codigo: true } });
    const year = Number(d.fecha_inicio.slice(0, 4));
    const codigo = nextAuditoriaCodigo(existing.map((a) => a.codigo), year);
    const auditoria = await prisma.auditoria.create({
      data: {
        organizacion_id: session.user.organizacion_id,
        codigo, nombre: d.nombre, tipo: d.tipo, alcance: d.alcance,
        fecha_inicio: d2(d.fecha_inicio), fecha_fin: d2(d.fecha_fin), fecha_vencimiento: d2(d.fecha_vencimiento),
        estado: d.estado,
      },
    });
    return NextResponse.json({ auditoria }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la auditoría");
  }
}
