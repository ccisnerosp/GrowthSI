// Edge middleware — HU01 + HU03.
// Protege todas las rutas privadas (redirige a /login si no hay sesión).
// La cookie de sesión Auth.js v5 se llama `authjs.session-token` (o
// `__Secure-authjs.session-token` en producción).

import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/registro", "/onboarding"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/registro", "/api/onboarding", "/_next", "/sgsi", "/favicon"];

// Lock-down de origin (HU-infra): cuando Azure Front Door está delante, solo se
// acepta tráfico que traiga el header `X-Azure-FDID` que AFD inyecta. Gobernado
// por la env var `AFD_FRONTDOOR_ID`: si no está definida, el chequeo es no-op
// (acceso directo al Container App permitido). Setear la var = activar el WAF
// como único camino; quitarla = revertir, sin necesidad de reconstruir la imagen.
const AFD_FRONTDOOR_ID = process.env.AFD_FRONTDOOR_ID;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // origin lock-down: rechazar lo que no venga de Front Door
  if (AFD_FRONTDOOR_ID && req.headers.get("x-azure-fdid") !== AFD_FRONTDOOR_ID) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // rutas públicas
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  for (const p of PUBLIC_PREFIXES) if (pathname.startsWith(p)) return NextResponse.next();

  // detectar cookie de sesión
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Excluye estáticos y assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sgsi/).*)"],
};
