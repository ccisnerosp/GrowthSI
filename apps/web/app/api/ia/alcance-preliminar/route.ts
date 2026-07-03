// HU58/HU12 — Alcance preliminar.
//
// ARQUITECTURA DE 2 SERVICIOS:
//   Este Route Handler (Next.js) es el INTERMEDIARIO. NO genera el alcance:
//   1. Valida sesión + RBAC + rate limit + límite de tokens (Prisma).
//   2. Reúne el contexto del tenant desde Prisma.
//   3. Llama al AI service (FastAPI :8000) vía lib/ai-client.ts.
//   4. Registra el consumo de tokens en ia_uso (Prisma).
//   5. Devuelve el resultado al navegador.
// El navegador nunca toca el AI service.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { assertWithinTokenLimit, recordUsage } from "@/lib/ai/usage";
import { assertRateLimit, RateLimitError } from "@/lib/ai/rate-limit";
import { apiError, parseBody } from "@/lib/api-helpers";
import { aiClient, AiServiceError } from "@/lib/ai-client";

// El cliente envía la SELECCIÓN ACTUAL en pantalla (no hace falta guardar antes).
// Si no llega (cliente antiguo), se cae a lo persistido (incluido_alcance = true).
const schema = z.object({
  sedes_ids:    z.array(z.number().int()).optional(),
  procesos_ids: z.array(z.number().int()).optional(),
  factores_ids: z.array(z.number().int()).optional(),
});

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("organizacion", "update");
  if (error) return error;
  const orgId = session.user.organizacion_id;
  const userId = session.user.userId;

  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const sel = parsed.data;

  try {
    assertRateLimit(userId);
    await assertWithinTokenLimit(orgId);

    // Generación = vista previa sobre la SELECCIÓN ACTUAL del usuario (WYSIWYG):
    //   · sedes/procesos/factores: los IDs marcados que envió el cliente
    //     (respaldo: incluido_alcance = true si el cliente no mandó selección).
    //   · activos derivados: solo los vinculados (proceso_activo) a procesos en alcance.
    //   · partes: contexto de cláusula 4.2 (informan la decisión, no se incluyen/excluyen).
    const sedeWhere    = sel.sedes_ids    ? { id: { in: sel.sedes_ids } }    : { incluido_alcance: true };
    const procesoWhere = sel.procesos_ids ? { id: { in: sel.procesos_ids } } : { incluido_alcance: true };
    const factorWhere  = sel.factores_ids ? { id: { in: sel.factores_ids } } : { incluido_alcance: true };

    const [org, sedes, procesos, factores, partes] = await Promise.all([
      prisma.organizacion.findUnique({
        where: { id: orgId },
        select: { nombre_organizacion: true, sector: true, numero_colaboradores: true, mision: true, vision: true, estado_sgsi: true },
      }),
      prisma.sede.findMany({ where: { organizacion_id: orgId, ...sedeWhere }, select: { codigo: true, nombre_sede: true, distrito_sede: true, departamento_sede: true, pais_sede: true } }),
      prisma.proceso.findMany({ where: { organizacion_id: orgId, ...procesoWhere }, select: { id: true, codigo: true, nombre: true, tipo: true, area: true, criticidad: true, descripcion: true } }),
      prisma.factor.findMany({ where: { organizacion_id: orgId, ...factorWhere }, select: { codigo: true, origen: true, categoria: true, tipo: true, descripcion: true, impacto: true } }),
      prisma.partesInteresadas.findMany({ where: { organizacion_id: orgId }, select: { codigo: true, nombre: true, tipo: true, expectativas: true, relevancia: true } }),
    ]);

    if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    if (sedes.length === 0 || procesos.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos una sede y un proceso para generar el alcance." }, { status: 400 });
    }

    // Activos cubiertos = derivados de los procesos en alcance vía proceso_activo
    const procesoIds = procesos.map((p) => p.id);
    const rel = procesoIds.length > 0
      ? await prisma.procesoActivo.findMany({
          where: { proceso_id: { in: procesoIds } },
          select: { activo_informacion_id: true },
        })
      : [];
    const activoIds = [...new Set(rel.map((r) => r.activo_informacion_id))];
    const activos = activoIds.length > 0
      ? await prisma.activoInformacion.findMany({
          where: { organizacion_id: orgId, id: { in: activoIds } },
          select: { codigo: true, nombre: true, tipo: true, clasificacion: true, valoracion: true, ubicacion: true },
        })
      : [];

    // Llamada al AI service (la anonimización de Personas + RAG ISO ocurren allá)
    const result = await aiClient.scopePreliminary({
      organizacion: {
        nombre_organizacion: org.nombre_organizacion,
        sector: org.sector,
        numero_colaboradores: org.numero_colaboradores,
        mision: org.mision,
        vision: org.vision,
        estado_sgsi: org.estado_sgsi,
      },
      sedes,
      procesos,
      activos,
      factores,
      partes,
    });

    // Registrar consumo de tokens (transaccional — dominio de Next.js)
    await recordUsage({
      organizacion_id: orgId,
      usuario_id: userId,
      operacion: "alcance_preliminar",
      modelo: "ai-service",
      tokens_input: result.usage.input,
      tokens_output: result.usage.output,
    });

    return NextResponse.json({
      alcance: result.alcance,
      citas: result.citas,
      tokens: result.usage,
      iso_disponible: result.iso_disponible,
    });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message, waitSeconds: e.waitSeconds }, { status: 429 });
    }
    if (e instanceof AiServiceError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return apiError(e, "No se pudo generar el alcance preliminar");
  }
}
