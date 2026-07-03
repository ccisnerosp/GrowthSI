// M4 — crear una No Conformidad (cláusula 10.1/10.2). Siempre ligada a una auditoría.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";

const SEVERIDAD = ["menor", "mayor", "critica"] as const;
const ESTADOS = ["identificada", "analisis", "plan", "ejecucion", "cerrada"] as const;
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z.object({
  auditoria_id:         z.coerce.number().int().positive(),
  titulo:               z.string().trim().min(2).max(220),
  descripcion:          z.string().trim().default(""),
  causa_raiz:           z.string().trim().default(""),
  accion_correctiva:    z.string().trim().default(""),
  severidad:            z.enum(SEVERIDAD),
  estado:               z.enum(ESTADOS).default("identificada"),
  fecha_identificacion: DATE.optional(),
  fecha_vencimiento:    DATE,
});

const d2 = (s: string) => new Date(s + "T00:00:00Z");

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("nc", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const aud = await prisma.auditoria.findUnique({ where: { id: d.auditoria_id } });
    if (!aud || aud.organizacion_id !== session.user.organizacion_id || aud.deleted_at) {
      return NextResponse.json({ error: "Auditoría no encontrada" }, { status: 404 });
    }
    const codigos = await prisma.noConformidad.findMany({ select: { codigo: true } });
    const codigo = nextCodeFromExisting("NC", codigos.map((n) => n.codigo));
    const nc = await prisma.noConformidad.create({
      data: {
        auditoria_id: d.auditoria_id, codigo, titulo: d.titulo, descripcion: d.descripcion,
        causa_raiz: d.causa_raiz, accion_correctiva: d.accion_correctiva, severidad: d.severidad,
        estado: d.estado,
        fecha_identificacion: d.fecha_identificacion ? d2(d.fecha_identificacion) : new Date(),
        fecha_vencimiento: d2(d.fecha_vencimiento),
        fecha_cierre: d.estado === "cerrada" ? new Date() : null,
      },
    });
    return NextResponse.json({ nc }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la no conformidad");
  }
}
