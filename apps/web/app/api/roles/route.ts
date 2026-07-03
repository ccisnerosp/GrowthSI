// CRUD de roles del SGSI (cláusula 5.3 — roles, responsabilidades y autoridades).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";

const createSchema = z.object({
  nombre:            z.string().trim().min(2).max(150),
  tipo:              z.enum(["Individual", "Órgano colegiado"]),
  descripcion:       z.string().trim().min(5),
  responsabilidades: z.string().trim().min(5),
  autoridades:       z.string().trim().min(2),
  usuario_id:        z.number().int().positive().nullable().default(null),
  estado:            z.enum(["activo", "inactivo"]).default("activo"),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("rol_sgsi", "read");
  if (error) return error;
  const roles = await prisma.rolSgsi.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("rol_sgsi", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const orgId = session.user.organizacion_id;

  // El titular asignado debe pertenecer a la misma organización.
  if (parsed.data.usuario_id != null) {
    const u = await prisma.usuario.findFirst({ where: { id: parsed.data.usuario_id, organizacion_id: orgId, deleted_at: null }, select: { id: true } });
    if (!u) return NextResponse.json({ error: "El usuario asignado no es válido." }, { status: 400 });
  }

  try {
    const existing = await prisma.rolSgsi.findMany({ where: { organizacion_id: orgId }, select: { codigo: true } });
    const codigo = nextCodeFromExisting("ROL", existing.map((r) => r.codigo));
    const rol = await prisma.rolSgsi.create({ data: { organizacion_id: orgId, codigo, ...parsed.data } });
    return NextResponse.json({ rol }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el rol del SGSI");
  }
}
