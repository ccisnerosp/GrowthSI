// M3 Riesgos — listar escenarios (con sus riesgos) y crear escenario.
// El POST sirve tanto para alta manual como para PERSISTIR una sugerencia IA
// aceptada (origen='ia', estado='generado', con un riesgo hijo embebido).

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { parseBody, apiError, nextCodeFromExisting } from "@/lib/api-helpers";
import { vectorizeRecordSafe } from "@/lib/ai/embeddings";
import { chunkForEscenario } from "@/lib/ai/chunk-text";

const DOMINIOS = ["tecnologico", "organizacional", "personas", "fisico"] as const;
const TRATAMIENTOS = ["mitigar", "transferir", "aceptar", "evitar"] as const;

const riesgoEmbebido = z.object({
  nombre:               z.string().trim().min(2).max(200),
  descripcion:          z.string().trim().default(""),
  probabilidad_inicial: z.coerce.number().int().min(1).max(10),
  impacto_inicial:      z.coerce.number().int().min(1).max(10),
  probabilidad_actual:  z.coerce.number().int().min(1).max(10).optional(),
  impacto_actual:       z.coerce.number().int().min(1).max(10).optional(),
  tratamiento:          z.enum(TRATAMIENTOS).default("mitigar"),
});

const createSchema = z.object({
  nombre:          z.string().trim().min(2).max(200),
  descripcion:     z.string().trim().default(""),
  amenaza:         z.string().trim().max(180).default(""),
  vulnerabilidad:  z.string().trim().max(180).default(""),
  dominio:         z.enum(DOMINIOS).optional(),
  origen:          z.enum(["manual", "ia"]).default("manual"),
  estado:          z.enum(["generado", "activo", "inactivo"]).optional(),
  justificacion_ia: z.string().trim().optional(),
  riesgo:          riesgoEmbebido.optional(),
});

export async function GET() {
  const { error, session } = await apiRequirePermission("escenario", "read");
  if (error) return error;
  const escenarios = await prisma.escenarioRiesgo.findMany({
    where: { organizacion_id: session.user.organizacion_id, deleted_at: null },
    select: {
      id: true, codigo: true, nombre: true, descripcion: true, amenaza: true,
      vulnerabilidad: true, dominio: true, origen: true, justificacion_ia: true,
      estado: true, created_at: true, updated_at: true,
      riesgos: {
        where: { deleted_at: null },
        select: {
          id: true, escenario_riesgo_id: true, codigo: true, nombre: true, descripcion: true,
          probabilidad_inicial: true, impacto_inicial: true, nivel_inicial: true,
          tratamiento: true, probabilidad_actual: true, impacto_actual: true,
          nivel_actual: true, origen: true, estado: true,
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ escenarios });
}

export async function POST(req: NextRequest) {
  const { error, session } = await apiRequirePermission("escenario", "create");
  if (error) return error;
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const orgId = session.user.organizacion_id;

  try {
    // Códigos únicos GLOBALES (la unicidad en BD no es por-tenant), por eso
    // calculamos sobre todos los códigos existentes para no colisionar.
    const [escCodigos, rgCodigos] = await Promise.all([
      prisma.escenarioRiesgo.findMany({ select: { codigo: true } }),
      d.riesgo ? prisma.riesgo.findMany({ select: { codigo: true } }) : Promise.resolve([]),
    ]);
    const codigo = nextCodeFromExisting("ESC", escCodigos.map((r) => r.codigo));

    const estadoEsc = d.estado ?? (d.origen === "ia" ? "generado" : "activo");

    const escenario = await prisma.$transaction(async (tx) => {
      const esc = await tx.escenarioRiesgo.create({
        data: {
          organizacion_id: orgId,
          codigo,
          nombre: d.nombre,
          descripcion: d.descripcion,
          amenaza: d.amenaza,
          vulnerabilidad: d.vulnerabilidad,
          dominio: d.dominio ?? null,
          origen: d.origen,
          justificacion_ia: d.justificacion_ia ?? null,
          estado: estadoEsc,
        },
      });

      if (d.riesgo) {
        const r = d.riesgo;
        const pi = r.probabilidad_inicial, ii = r.impacto_inicial;
        const pa = r.probabilidad_actual ?? pi, ia = r.impacto_actual ?? ii;
        const codigoR = nextCodeFromExisting("R", rgCodigos.map((x) => x.codigo));
        await tx.riesgo.create({
          data: {
            escenario_riesgo_id: esc.id,
            codigo: codigoR,
            nombre: r.nombre,
            descripcion: r.descripcion,
            probabilidad_inicial: pi, impacto_inicial: ii, nivel_inicial: pi * ii,
            tratamiento: r.tratamiento,
            probabilidad_actual: pa, impacto_actual: ia, nivel_actual: pa * ia,
            origen: d.origen,
            estado: d.origen === "ia" ? "generado" : "tratamiento",
          },
        });
      }

      return esc;
    });

    // Vectorización del escenario (no bloqueante: nunca rompe el alta).
    await vectorizeRecordSafe({
      organizacion_id: orgId,
      tabla_origen: "escenario_riesgo",
      registro_origen_id: escenario.id,
      campo_origen: "descripcion",
      chunk_texto: chunkForEscenario(escenario),
      metadata: { dominio: escenario.dominio, origen: escenario.origen },
    });

    const full = await prisma.escenarioRiesgo.findUnique({
      where: { id: escenario.id },
      include: { riesgos: { where: { deleted_at: null }, orderBy: { id: "asc" } } },
    });
    return NextResponse.json({ escenario: full }, { status: 201 });
  } catch (e) {
    return apiError(e, "No se pudo crear el escenario");
  }
}
