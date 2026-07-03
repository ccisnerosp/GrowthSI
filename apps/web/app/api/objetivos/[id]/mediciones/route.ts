// P2 — Registrar una medición de un objetivo del SGSI (cláusula 9.1).
// El cumplimiento NO se almacena: se deriva al leer comparando con la meta.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  valor: z.coerce.number(),
  fecha_medicion: z.string().optional(),
  nota: z.string().trim().max(500).default(""),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { error, session } = await apiRequirePermission("objetivo", "update");
  if (error) return error;
  const objetivoId = Number((await params).id);
  if (!Number.isInteger(objetivoId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  try {
    const obj = await prisma.objetivoSgsi.findUnique({ where: { id: objetivoId }, select: { organizacion_id: true } });
    if (!obj || obj.organizacion_id !== session.user.organizacion_id) {
      return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
    }
    const medicion = await prisma.medicionObjetivo.create({
      data: {
        objetivo_id: objetivoId,
        valor: d.valor,
        fecha_medicion: d.fecha_medicion ? new Date(d.fecha_medicion) : new Date(),
        nota: d.nota,
        registrado_por_usuario_id: session.user.userId,
      },
    });
    return NextResponse.json({ medicion }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo registrar la medición");
  }
}
