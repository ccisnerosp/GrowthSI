// Server-side auth/RBAC helpers usados por API routes y server components.

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { type Action, type Resource, can } from "@/lib/rbac";

/** Requiere sesión; redirige a /login si no hay (para server components). */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/** Requiere permiso; redirige a /dashboard si no lo tiene (para server components). */
export async function requirePermission(resource: Resource, action: Action) {
  const session = await requireSession();
  if (!can(session.user.rol, resource, action)) {
    redirect("/dashboard?forbidden=" + encodeURIComponent(`${resource}:${action}`));
  }
  return session;
}

/** Para API routes: devuelve 401/403 si no aplica. */
export async function apiRequirePermission(resource: Resource, action: Action) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }), session: null };
  }
  if (!can(session.user.rol, resource, action)) {
    return {
      error: NextResponse.json(
        { error: `Acceso denegado: el rol "${session.user.rol}" no puede ${action} ${resource}` },
        { status: 403 },
      ),
      session: null,
    };
  }
  return { error: null, session };
}
