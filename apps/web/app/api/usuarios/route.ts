// HU04 — API usuarios (lista + crear). RBAC enforced en el servidor.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { ROLES } from "@/lib/rbac";

// GET /api/usuarios — lista usuarios del tenant del que está logueado
export async function GET() {
  const { error, session } = await apiRequirePermission("usuario", "read");
  if (error) return error;

  const usuarios = await prisma.usuario.findMany({
    where: { organizacion_id: session.user.organizacion_id },
    select: {
      id: true,
      nombre: true,
      correo: true,
      funcion: true,
      rol: true,
      area: true,
      mfa_activo: true,
      azure_oid: true,
      ultimo_acceso_at: true,
      estado: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ usuarios });
}

const createSchema = z.object({
  nombre:   z.string().trim().min(2).max(150),
  correo:   z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(72),
  funcion:  z.string().trim().min(1).max(120),
  rol:      z.enum(ROLES as readonly [string, ...string[]]),
  area:     z.string().trim().min(1).max(100),
  mfa_activo: z.boolean().optional().default(false),
});

// POST /api/usuarios — crea usuario en el tenant actual
export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("usuario", "create");
  if (error) return error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Hay campos con errores", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const exists = await prisma.usuario.findUnique({ where: { correo: d.correo }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
  }

  try {
    const password_hash = await bcrypt.hash(d.password, 10);
    const u = await prisma.usuario.create({
      data: {
        organizacion_id: session.user.organizacion_id,
        nombre: d.nombre,
        correo: d.correo,
        password_hash,
        funcion: d.funcion,
        rol: d.rol,
        area: d.area,
        mfa_activo: d.mfa_activo,
        estado: "activo",
      },
      select: { id: true, nombre: true, correo: true, rol: true, area: true, mfa_activo: true, estado: true },
    });
    return NextResponse.json({ ok: true, usuario: u }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Conflicto de unicidad" }, { status: 409 });
    }
    console.error("[api/usuarios POST] error", e);
    return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 });
  }
}
