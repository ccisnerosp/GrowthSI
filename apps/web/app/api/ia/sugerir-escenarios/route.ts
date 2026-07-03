// HU60/HU61 — Sugerir escenarios de riesgo con IA (los 4 dominios ISO 27001).
//
// Función IA más importante del sistema. Next.js como intermediario: reúne el
// contexto de la organización (Prisma), llama al AI service (RAG offline por
// dominio + NVD online para activos con tecnología), registra ia_uso y devuelve
// las sugerencias al navegador. NO persiste: el usuario revisa y, al aceptar,
// el cliente hace POST /api/escenarios (origen='ia', estado='generado').

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { recordUsage, assertWithinTokenLimit } from "@/lib/ai/usage";
import { assertRateLimit, RateLimitError } from "@/lib/ai/rate-limit";
import { apiError, parseBody } from "@/lib/api-helpers";
import { aiClient, AiServiceError } from "@/lib/ai-client";

const DOMINIOS = ["tecnologico", "organizacional", "personas", "fisico"] as const;

const schema = z.object({
  dominios:    z.array(z.enum(DOMINIOS)).min(1).max(4).optional(),
  por_dominio: z.coerce.number().int().min(1).max(4).optional(),
  max_prob:    z.coerce.number().int().min(3).max(6).optional(),
  max_impact:  z.coerce.number().int().min(3).max(6).optional(),
  // "Generar más": escenarios ya mostrados en la sesión (aún sin guardar) que
  // tampoco deben repetirse. Se suman a los ya registrados en BD.
  excluir: z.array(z.object({
    nombre: z.string(),
    dominio: z.string().optional(),
    amenaza: z.string().optional(),
    vulnerabilidad: z.string().optional(),
  })).max(60).optional(),
});

export async function POST(req: NextRequest) {
  // Sugerir escenarios = crear escenarios → permiso escenario:create.
  const { error, session } = await apiRequirePermission("escenario", "create");
  if (error) return error;
  const orgId = session.user.organizacion_id;
  const userId = session.user.userId;

  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    assertRateLimit(userId);
    await assertWithinTokenLimit(orgId);

    const [org, sedes, procesos, activos, factores, partes, escenarios] = await Promise.all([
      prisma.organizacion.findUnique({
        where: { id: orgId },
        select: {
          nombre_organizacion: true, sector: true, numero_colaboradores: true,
          mision: true, vision: true, estado_sgsi: true, alcance_sgsi: true,
          criterio_riesgo_p: true, criterio_riesgo_i: true,
        },
      }),
      prisma.sede.findMany({ where: { organizacion_id: orgId }, select: { codigo: true, nombre_sede: true, distrito_sede: true, departamento_sede: true, pais_sede: true } }),
      prisma.proceso.findMany({ where: { organizacion_id: orgId, deleted_at: null }, select: { codigo: true, nombre: true, tipo: true, area: true, criticidad: true, descripcion: true } }),
      prisma.activoInformacion.findMany({
        where: { organizacion_id: orgId, deleted_at: null },
        select: {
          codigo: true, nombre: true, tipo: true, clasificacion: true, valoracion: true, ubicacion: true,
          confidencialidad: true, integridad: true, disponibilidad: true, exposicion: true,
          modelo: true, version: true, proveedor: true,
          procesos: { select: { criticidad_relacion: true, proceso: { select: { nombre: true, criticidad: true, deleted_at: true } } } },
        },
      }),
      prisma.factor.findMany({ where: { organizacion_id: orgId, incluido_alcance: true }, select: { codigo: true, origen: true, categoria: true, tipo: true, descripcion: true, impacto: true } }),
      prisma.partesInteresadas.findMany({ where: { organizacion_id: orgId }, select: { codigo: true, nombre: true, tipo: true, expectativas: true, relevancia: true } }),
      // Existentes con amenaza/vulnerabilidad + estado del riesgo: refuerza la
      // deduplicación (no solo el nombre) y prioriza ángulos nuevos sobre lo tratado.
      prisma.escenarioRiesgo.findMany({
        where: { organizacion_id: orgId, deleted_at: null },
        select: {
          nombre: true, dominio: true, amenaza: true, vulnerabilidad: true,
          riesgos: { where: { deleted_at: null }, select: { estado: true, tratamiento: true }, take: 1 },
        },
      }),
    ]);
    if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });

    // Existentes (BD) + excluidos de la sesión ("generar más"), todos como contexto de dedup.
    const escenariosExistentes = [
      ...escenarios.map((e) => ({
        nombre: e.nombre,
        dominio: e.dominio ?? "",
        amenaza: e.amenaza ?? "",
        vulnerabilidad: e.vulnerabilidad ?? "",
        estado: e.riesgos[0]?.estado ?? "",
        tratamiento: e.riesgos[0]?.tratamiento ?? "",
      })),
      ...(body.excluir ?? []).map((x) => ({
        nombre: x.nombre,
        dominio: x.dominio ?? "",
        amenaza: x.amenaza ?? "",
        vulnerabilidad: x.vulnerabilidad ?? "",
        estado: "",
        tratamiento: "",
      })),
    ];

    const result = await aiClient.suggestRisks({
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
      activos: activos.map((a) => ({
        codigo: a.codigo, nombre: a.nombre, tipo: a.tipo,
        clasificacion: a.clasificacion, valoracion: a.valoracion, ubicacion: a.ubicacion,
        confidencialidad: a.confidencialidad, integridad: a.integridad, disponibilidad: a.disponibilidad,
        exposicion: a.exposicion,
        modelo: a.modelo, version: a.version, proveedor: a.proveedor,
        procesos: a.procesos
          .filter((pa) => !pa.proceso.deleted_at)
          .map((pa) => ({ nombre: pa.proceso.nombre, criticidad: pa.proceso.criticidad, relacion: pa.criticidad_relacion })),
      })),
      factores,
      partes,
      alcance_sgsi: org.alcance_sgsi,
      escenarios_existentes: escenariosExistentes,
      criterios: {
        max_prob: body.max_prob ?? org.criterio_riesgo_p ?? 5,
        max_impact: body.max_impact ?? org.criterio_riesgo_i ?? 5,
      },
      dominios: body.dominios ?? [...DOMINIOS],
      por_dominio: body.por_dominio ?? 2,
    });

    await recordUsage({
      organizacion_id: orgId,
      usuario_id: userId,
      operacion: "sugerir_riesgos",
      modelo: "ai-service",
      tokens_input: result.usage.input,
      tokens_output: result.usage.output,
    });

    return NextResponse.json({
      escenarios: result.escenarios,
      fuentes_disponibles: result.fuentes_disponibles,
      nvd_consultado: result.nvd_consultado,
      cve_encontrados: result.cve_encontrados,
      omitidos_similares: result.omitidos_similares,
      cve_descartados: result.cve_descartados,
    });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message, waitSeconds: e.waitSeconds }, { status: 429 });
    }
    if (e instanceof AiServiceError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return apiError(e, "No se pudieron sugerir escenarios de riesgo");
  }
}
