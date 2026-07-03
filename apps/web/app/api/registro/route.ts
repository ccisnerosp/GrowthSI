// HU02 — POST /api/registro
// Crea (tenant, organizacion, usuario admin) en una transacción.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const ESTADOS_SGSI = ["Diagnóstico", "Planificación", "Implementación", "Operación", "Certificado"] as const;

const schema = z.object({
  // organización
  nombre_organizacion:  z.string().trim().min(2, "Mínimo 2 caracteres").max(180),
  ruc:                  z.string().regex(/^\d{11}$/, "El RUC debe tener exactamente 11 dígitos"),
  sector:               z.string().trim().min(1, "Selecciona un sector"),
  numero_colaboradores: z.coerce.number().int().min(1, "Mínimo 1 colaborador").max(1_000_000),
  dominio:              z.string().trim().min(3, "Dominio inválido").max(120),
  mision:               z.string().trim().min(10, "Mínimo 10 caracteres"),
  vision:               z.string().trim().min(10, "Mínimo 10 caracteres"),
  estado_sgsi:          z.enum(ESTADOS_SGSI),
  inicio_proyecto:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),

  // usuario administrador (HU02 opción A)
  admin_nombre:   z.string().trim().min(2, "Mínimo 2 caracteres").max(150),
  admin_correo:   z.string().email("Correo inválido").transform((s) => s.toLowerCase().trim()),
  admin_password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Hay campos con errores",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Pre-check de unicidad (mejor mensaje al usuario que esperar la excepción Prisma)
  const [existRuc, existCorreo] = await Promise.all([
    prisma.organizacion.findUnique({ where: { ruc: d.ruc }, select: { id: true } }),
    prisma.usuario.findUnique({ where: { correo: d.admin_correo }, select: { id: true } }),
  ]);
  if (existRuc) {
    return NextResponse.json({ error: "El RUC ya está registrado" }, { status: 409 });
  }
  if (existCorreo) {
    return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
  }

  // Código auto-incremental simple ORG-NNN
  const orgCount = await prisma.organizacion.count();
  const codigo = `ORG-${String(orgCount + 1).padStart(3, "0")}`;

  const password_hash = await bcrypt.hash(d.admin_password, 10);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.create({
          data: { nombre: d.nombre_organizacion, plan: "Trial", activo: true },
        });

        const organizacion = await tx.organizacion.create({
          data: {
            tenant_id: tenant.id,
            codigo,
            nombre_organizacion: d.nombre_organizacion,
            ruc: d.ruc,
            sector: d.sector,
            numero_colaboradores: d.numero_colaboradores,
            dominio: d.dominio,
            mision: d.mision,
            vision: d.vision,
            estado_sgsi: d.estado_sgsi,
            inicio_proyecto: new Date(d.inicio_proyecto + "T00:00:00Z"),
            estado: "activo",
          },
        });

        const usuario = await tx.usuario.create({
          data: {
            organizacion_id: organizacion.id,
            nombre: d.admin_nombre,
            correo: d.admin_correo,
            password_hash,
            funcion: "Administrador del SGSI",
            rol: "Administrador",
            area: "Gerencia",
            mfa_activo: false,
            estado: "activo",
          },
        });

        return { tenant_id: tenant.id, organizacion_id: organizacion.id, codigo, correo: usuario.correo };
      },
      { timeout: 15000 }, // dev: el primer compile de Turbopack puede ser lento
    );

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(",") ?? "campo";
      return NextResponse.json({ error: `Conflicto de unicidad en ${target}` }, { status: 409 });
    }
    console.error("[api/registro] error", e);
    return NextResponse.json({ error: "Ocurrió un error al registrar la organización" }, { status: 500 });
  }
}
