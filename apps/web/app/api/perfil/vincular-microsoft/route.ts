// HU05 — POST /api/perfil/vincular-microsoft
// Simula la vinculación de la cuenta del usuario actual con Microsoft Entra ID.
// Genera un azure_oid pseudo-aleatorio (formato GUID) y lo guarda en usuario.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Si ya está vinculado, no hacemos nada (idempotente)
  const current = await prisma.usuario.findUnique({
    where: { id: session.user.userId },
    select: { id: true, azure_oid: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (current.azure_oid) {
    return NextResponse.json({ ok: true, azure_oid: current.azure_oid, already: true });
  }

  // Genera un OID simulado (en un flujo real vendría del callback de Azure AD)
  const azure_oid = randomUUID();

  try {
    const updated = await prisma.usuario.update({
      where: { id: current.id },
      data: { azure_oid },
      select: { azure_oid: true },
    });
    return NextResponse.json({ ok: true, azure_oid: updated.azure_oid });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Este azure_oid ya está vinculado a otro usuario" }, { status: 409 });
    }
    console.error("[api/perfil/vincular-microsoft] error", e);
    return NextResponse.json({ error: "No se pudo vincular la cuenta Microsoft" }, { status: 500 });
  }
}
