// Helpers comunes para API routes: parseo, errores, generación de códigos.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodSchema } from "zod";

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "JSON inválido" }, { status: 400 }) };
  }
  try {
    const data = schema.parse(raw);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Hay campos con errores",
            issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          },
          { status: 400 },
        ),
      };
    }
    return { ok: false, response: NextResponse.json({ error: "Datos inválidos" }, { status: 400 }) };
  }
}

export function apiError(err: unknown, defaultMessage: string): NextResponse {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "campo";
      return NextResponse.json({ error: `Conflicto de unicidad en ${target}` }, { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
  }
  // Errores controlados (TokenLimitError, RateLimitError, ForbiddenError…)
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = Number((err as { status: number }).status);
    const message = (err as { message?: string }).message ?? defaultMessage;
    if (Number.isInteger(status) && status >= 400 && status < 600) {
      return NextResponse.json({ error: message }, { status });
    }
  }
  console.error(defaultMessage, err);
  return NextResponse.json({ error: defaultMessage }, { status: 500 });
}

/**
 * Calcula el siguiente código a partir de los códigos EXISTENTES del tenant.
 * Toma el mayor sufijo numérico + 1 (no usa count → robusto ante borrados).
 *
 * Ejemplo: nextCodeFromExisting('SED', ['SED-001','SED-003']) → 'SED-004'
 *          (con count() habría regenerado 'SED-003' y colisionado)
 */
export function nextCodeFromExisting(prefix: string, existing: string[], pad = 3): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  const re = new RegExp(`^${escaped}-(\\d+)$`);
  let max = 0;
  for (const c of existing) {
    const m = c?.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(pad, "0")}`;
}
