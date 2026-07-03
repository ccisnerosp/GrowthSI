// HU05 — POST /api/perfil/desvincular-microsoft
// Quita el azure_oid del usuario actual.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    await prisma.usuario.update({
      where: { id: session.user.userId },
      data: { azure_oid: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/perfil/desvincular-microsoft] error", e);
    return NextResponse.json({ error: "No se pudo desvincular la cuenta" }, { status: 500 });
  }
}
