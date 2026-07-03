// HU18 — Aprobaciones (workflow). Crear solicitud + lectura.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";

const createSchema = z.object({
  tipo_entidad:      z.enum(["alcance", "objetivo", "documento"]),
  entidad_id:        z.number().int(),
  comentario:        z.string().trim().min(20, "Mínimo 20 caracteres en el sustento"),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  const { error, session } = await apiRequirePermission("aprobacion", "read");
  if (error) return error;
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo_entidad");
  const entidad_id = url.searchParams.get("entidad_id");
  const aprobaciones = await prisma.aprobacion.findMany({
    where: {
      organizacion_id: session.user.organizacion_id,
      ...(tipo && { tipo_entidad: tipo }),
      ...(entidad_id && { entidad_id: BigInt(entidad_id) }),
    },
    orderBy: { fecha_solicitud: "desc" },
  });
  return NextResponse.json({
    aprobaciones: aprobaciones.map((a) => ({ ...a, entidad_id: Number(a.entidad_id) })),
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("aprobacion", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;
  try {
    // Para documentos: la entidad debe existir en el tenant y no tener ya una
    // solicitud pendiente (evita duplicados al clicar dos veces).
    if (d.tipo_entidad === "documento") {
      const doc = await prisma.documento.findFirst({
        where: { id: d.entidad_id, organizacion_id: orgId, deleted_at: null },
        select: { id: true },
      });
      if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
      const pendiente = await prisma.aprobacion.findFirst({
        where: { organizacion_id: orgId, tipo_entidad: "documento", entidad_id: BigInt(d.entidad_id), estado: "pendiente" },
        select: { id: true },
      });
      if (pendiente) return NextResponse.json({ error: "Ya existe una solicitud pendiente para este documento" }, { status: 409 });
    }

    const existing = await prisma.aprobacion.findMany({ where: { organizacion_id: orgId }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("APR", existing.map((r) => r.codigo));

    const aprobacion = await prisma.$transaction(async (tx) => {
      const created = await tx.aprobacion.create({
        data: {
          organizacion_id: orgId,
          codigo,
          tipo_entidad: d.tipo_entidad,
          entidad_id: BigInt(d.entidad_id),
          comentario: d.comentario,
          fecha_vencimiento: new Date(d.fecha_vencimiento + "T00:00:00Z"),
          estado: "pendiente",
        },
      });
      // Al solicitar aprobación, el documento pasa a 'revision'.
      if (d.tipo_entidad === "documento") {
        await tx.documento.updateMany({
          where: { id: Number(created.entidad_id), organizacion_id: orgId },
          data: { estado: "revision" },
        });
      }
      return created;
    });

    return NextResponse.json({ aprobacion: { ...aprobacion, entidad_id: Number(aprobacion.entidad_id) } }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear la solicitud de aprobación");
  }
}
