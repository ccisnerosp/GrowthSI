// M4 — crear un hallazgo de auditoría.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";

const SEVERIDAD = ["menor", "mayor", "critica"] as const;
const ESTADOS = ["abierto", "cerrado"] as const;

const createSchema = z.object({
  auditoria_id: z.coerce.number().int().positive(),
  titulo:       z.string().trim().min(2).max(220),
  descripcion:  z.string().trim().default(""),
  severidad:    z.enum(SEVERIDAD),
  estado:       z.enum(ESTADOS).default("abierto"),
});

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("hallazgo", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  try {
    const aud = await prisma.auditoria.findUnique({ where: { id: d.auditoria_id } });
    if (!aud || aud.organizacion_id !== session.user.organizacion_id || aud.deleted_at) {
      return NextResponse.json({ error: "Auditoría no encontrada" }, { status: 404 });
    }
    const codigos = await prisma.auditoriaHallazgo.findMany({ select: { codigo: true } });
    const codigo = nextCodeFromExisting("HAL", codigos.map((h) => h.codigo));
    const hallazgo = await prisma.auditoriaHallazgo.create({
      data: { auditoria_id: d.auditoria_id, codigo, titulo: d.titulo, descripcion: d.descripcion, severidad: d.severidad, estado: d.estado },
    });
    return NextResponse.json({ hallazgo }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el hallazgo");
  }
}
