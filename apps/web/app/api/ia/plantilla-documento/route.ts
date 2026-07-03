// HU23/HU59 — Generar plantilla de documento con IA.
// Next.js como intermediario: valida, reúne contexto (Prisma), llama al AI
// service, registra ia_uso, devuelve el HTML al navegador.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { recordUsage, assertWithinTokenLimit } from "@/lib/ai/usage";
import { assertRateLimit, RateLimitError } from "@/lib/ai/rate-limit";
import { apiError, parseBody } from "@/lib/api-helpers";
import { aiClient, AiServiceError } from "@/lib/ai-client";
import { revisionPendiente } from "@/lib/alcance-revision";

const schema = z.object({
  tipo:   z.enum(["Política", "Procedimiento", "Plan", "Instructivo", "Registro", "Manual", "Control"]),
  nombre: z.string().trim().min(2).max(200),
});

export async function POST(req: NextRequest) {
  // Generar plantilla = crear documentación → permiso documento:create
  const { error, session } = await apiRequirePermission("documento", "create");
  if (error) return error;
  const orgId = session.user.organizacion_id;
  const userId = session.user.userId;

  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.response;

  try {
    assertRateLimit(userId);
    await assertWithinTokenLimit(orgId);

    // Reunimos SOLO la información dentro del alcance del SGSI:
    //   · sedes/procesos/factores con incluido_alcance = true.
    //   · activos derivados de los procesos en alcance (vía proceso_activo).
    //   · partes interesadas (contexto 4.2) y roles del SGSI (5.3).
    const [org, objetivos, sedes, procesos, factores, partes, roles, revision] = await Promise.all([
      prisma.organizacion.findUnique({
        where: { id: orgId },
        select: { nombre_organizacion: true, sector: true, numero_colaboradores: true, mision: true, vision: true, estado_sgsi: true, alcance_sgsi: true },
      }),
      prisma.objetivoSgsi.findMany({
        where: { organizacion_id: orgId, estado: "activo" },
        select: { codigo: true, nombre: true, descripcion: true, indicador: true, meta: true },
        orderBy: { codigo: "asc" },
      }),
      prisma.sede.findMany({
        where: { organizacion_id: orgId, incluido_alcance: true },
        select: { codigo: true, nombre_sede: true, distrito_sede: true, departamento_sede: true, pais_sede: true },
        orderBy: { id: "asc" },
      }),
      prisma.proceso.findMany({
        where: { organizacion_id: orgId, incluido_alcance: true },
        select: { id: true, codigo: true, nombre: true, tipo: true, area: true, criticidad: true, descripcion: true },
        orderBy: { id: "asc" },
      }),
      prisma.factor.findMany({
        where: { organizacion_id: orgId, incluido_alcance: true },
        select: { codigo: true, origen: true, categoria: true, tipo: true, descripcion: true, impacto: true },
        orderBy: { id: "asc" },
      }),
      prisma.partesInteresadas.findMany({
        where: { organizacion_id: orgId },
        select: { codigo: true, nombre: true, tipo: true, expectativas: true, relevancia: true },
        orderBy: { id: "asc" },
      }),
      prisma.rolSgsi.findMany({
        where: { organizacion_id: orgId, estado: "activo" },
        select: { codigo: true, nombre: true, tipo: true, responsabilidades: true, autoridades: true },
        orderBy: { codigo: "asc" },
      }),
      // R1 — coherencia: ¿cambió el alcance y este módulo no se ha revisado?
      revisionPendiente(orgId, "documentos"),
    ]);
    if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });

    // Activos en alcance = los vinculados (proceso_activo) a procesos en alcance.
    const procesoIds = procesos.map((p) => p.id);
    const rel = procesoIds.length > 0
      ? await prisma.procesoActivo.findMany({ where: { proceso_id: { in: procesoIds } }, select: { activo_informacion_id: true } })
      : [];
    const activoIds = [...new Set(rel.map((r) => r.activo_informacion_id))];
    const activos = activoIds.length > 0
      ? await prisma.activoInformacion.findMany({
          where: { organizacion_id: orgId, id: { in: activoIds } },
          select: { codigo: true, nombre: true, tipo: true, clasificacion: true, valoracion: true },
          orderBy: { id: "asc" },
        })
      : [];

    const result = await aiClient.documentTemplate({
      tipo: parsed.data.tipo,
      nombre: parsed.data.nombre,
      alcance_sgsi: org.alcance_sgsi,
      organizacion: {
        nombre_organizacion: org.nombre_organizacion,
        sector: org.sector,
        numero_colaboradores: org.numero_colaboradores,
        mision: org.mision,
        vision: org.vision,
        estado_sgsi: org.estado_sgsi,
      },
      objetivos,
      sedes,
      procesos,
      activos,
      factores,
      partes,
      roles,
    });

    await recordUsage({
      organizacion_id: orgId,
      usuario_id: userId,
      operacion: "plantilla_documento",
      modelo: "ai-service",
      tokens_input: result.usage.input,
      tokens_output: result.usage.output,
    });

    return NextResponse.json({
      contenido_html: result.contenido_html,
      citas: result.citas,
      iso_disponible: result.iso_disponible,
      // R1 — el alcance cambió y este módulo aún no se ha revisado: la plantilla
      // se generó con la información en alcance vigente, pero conviene avisar.
      alcance_pendiente: revision.pendiente,
      alcance_modificado_at: revision.modificadoAt,
    });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message, waitSeconds: e.waitSeconds }, { status: 429 });
    }
    if (e instanceof AiServiceError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return apiError(e, "No se pudo generar la plantilla del documento");
  }
}
