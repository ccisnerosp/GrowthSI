// Registrar la revisión de un módulo (documentos | riesgos | controles) tras un
// cambio del alcance del SGSI. Cada POST inserta una fila → rastro auditable de
// quién confirmó la revisión y cuándo. Limpia el banner de ese módulo.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError } from "@/lib/api-helpers";
import { MODULOS_ALCANCE, type ModuloAlcance } from "@/lib/alcance-revision";

const schema = z.object({ modulo: z.string() });

export async function POST(req: NextRequest) {
  // Confirmar la revisión es una acción sobre la gobernanza del alcance:
  // mismo permiso que editarlo (organizacion:update).
  const { error, session } = await apiRequirePermission("organizacion", "update");
  if (error) return error;
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;

  const modulo = parsed.data.modulo as ModuloAlcance;
  if (!MODULOS_ALCANCE.includes(modulo)) {
    return NextResponse.json({ error: "Módulo inválido" }, { status: 400 });
  }

  try {
    await prisma.revisionAlcance.create({
      data: {
        organizacion_id: session.user.organizacion_id,
        modulo,
        revisado_por: session.user.userId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "No se pudo registrar la revisión");
  }
}
