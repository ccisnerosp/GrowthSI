// SoA — Sugerir controles del Anexo A con IA.
//
// Next.js como intermediario: reúne los riesgos a mitigar + el catálogo del Anexo A
// + los controles ya en la SoA, llama al AI service (RAG ISO 27002), y PERSISTE los
// controles sugeridos como control_soa (estado 'generado', origen 'ia') con sus
// enlaces N:N riesgo_control. El CISO los acepta/descarta luego en la SoA.

import { NextResponse } from "next/server";
import { apiRequirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { recordUsage, assertWithinTokenLimit } from "@/lib/ai/usage";
import { assertRateLimit, RateLimitError } from "@/lib/ai/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { aiClient, AiServiceError } from "@/lib/ai-client";

export async function POST() {
  const { error, session } = await apiRequirePermission("control_soa", "create");
  if (error) return error;
  const orgId = session.user.organizacion_id;
  const userId = session.user.userId;

  try {
    assertRateLimit(userId);
    await assertWithinTokenLimit(orgId);

    const [org, riesgos, catalogo, soaExistentes, objetivos] = await Promise.all([
      prisma.organizacion.findUnique({
        where: { id: orgId },
        select: { nombre_organizacion: true, sector: true, numero_colaboradores: true, mision: true, vision: true, estado_sgsi: true, alcance_sgsi: true },
      }),
      // Riesgos a tratar: 'mitigar', ya revisados (no 'generado') y SIN cobertura
      // (ningún control enlazado). El sugeridor es incremental: solo cierra brechas.
      // En la primera construcción todos están sin cobertura → se cubren todos.
      prisma.riesgo.findMany({
        where: {
          deleted_at: null, tratamiento: "mitigar", estado: { not: "generado" },
          escenario: { organizacion_id: orgId }, controles: { none: {} },
        },
        select: {
          codigo: true, nombre: true, descripcion: true, nivel_actual: true, tratamiento: true,
          escenario: { select: { dominio: true, amenaza: true, vulnerabilidad: true } },
        },
      }),
      prisma.controlAnexoA.findMany({ select: { id: true, codigo: true, nombre: true, dominio: true }, orderBy: { codigo: "asc" } }),
      prisma.controlSoa.findMany({ where: { organizacion_id: orgId }, select: { control_anexo_a: { select: { codigo: true } } } }),
      prisma.objetivoSgsi.findMany({
        where: { organizacion_id: orgId, estado: "activo" },
        select: { codigo: true, nombre: true, descripcion: true, indicador: true, meta: true },
        orderBy: { codigo: "asc" },
      }),
    ]);
    if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    if (riesgos.length === 0) {
      // Distingue 'no hay riesgos mitigar' de 'todos ya tienen cobertura'.
      const totalMitigar = await prisma.riesgo.count({
        where: { deleted_at: null, tratamiento: "mitigar", estado: { not: "generado" }, escenario: { organizacion_id: orgId } },
      });
      const msg = totalMitigar === 0
        ? "No hay riesgos con tratamiento 'mitigar' revisados. Acepta riesgos en el módulo de Riesgos antes de sugerir controles."
        : "Todos los riesgos 'mitigar' ya tienen al menos un control asignado. No hay brechas de cobertura que tratar.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const result = await aiClient.suggestControls({
      organizacion: {
        nombre_organizacion: org.nombre_organizacion,
        sector: org.sector,
        numero_colaboradores: org.numero_colaboradores,
        mision: org.mision,
        vision: org.vision,
        estado_sgsi: org.estado_sgsi,
      },
      alcance_sgsi: org.alcance_sgsi,
      riesgos: riesgos.map((r) => ({
        codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion,
        amenaza: r.escenario.amenaza, vulnerabilidad: r.escenario.vulnerabilidad,
        dominio: r.escenario.dominio ?? "", nivel_actual: r.nivel_actual, tratamiento: r.tratamiento,
      })),
      controles_catalogo: catalogo.map((c) => ({ codigo: c.codigo, nombre: c.nombre, dominio: c.dominio })),
      controles_existentes: soaExistentes.map((s) => s.control_anexo_a.codigo),
      objetivos,
    });

    await recordUsage({
      organizacion_id: orgId, usuario_id: userId, operacion: "sugerir_controles",
      modelo: "ai-service", tokens_input: result.usage.input, tokens_output: result.usage.output,
    });

    // ── Persistir los controles sugeridos (estado 'generado') + enlaces N:N ──
    const catByCodigo = new Map(catalogo.map((c) => [c.codigo, c]));
    const riesgoIdByCodigo = new Map<string, number>();
    const riesgoRows = await prisma.riesgo.findMany({
      where: { deleted_at: null, escenario: { organizacion_id: orgId } },
      select: { id: true, codigo: true },
    });
    for (const r of riesgoRows) riesgoIdByCodigo.set(r.codigo, r.id);

    let creados = 0;      // controles nuevos creados en la SoA
    let enlazados = 0;    // enlaces riesgo→control nuevos sobre controles existentes
    let reevaluar = 0;    // controles existentes marcados para reevaluación
    const ahora = new Date();
    for (const c of result.controles) {
      const cat = catByCodigo.get(c.codigo);
      if (!cat) continue;

      const riesgoIds = c.riesgos_cubiertos
        .map((rc) => riesgoIdByCodigo.get(rc))
        .filter((id): id is number => typeof id === "number");

      const existing = await prisma.controlSoa.findUnique({
        where: { control_anexo_a_id_organizacion_id: { control_anexo_a_id: cat.id, organizacion_id: orgId } },
        select: { id: true, observaciones: true },
      });

      if (existing) {
        // ── Reutilización: el control ya está en la SoA. Solo añadimos los
        // enlaces de riesgo que faltan y lo marcamos para reevaluación.
        const yaEnlazados = new Set(
          (await prisma.riesgoControl.findMany({ where: { control_soa_id: existing.id }, select: { riesgo_id: true } }))
            .map((r) => r.riesgo_id),
        );
        const nuevos = riesgoIds.filter((id) => !yaEnlazados.has(id));
        if (nuevos.length === 0) continue;

        await prisma.riesgoControl.createMany({
          data: nuevos.map((riesgo_id) => ({ control_soa_id: existing.id, riesgo_id, tipo_relacion: "mitiga", efectividad_estimada: "media", observaciones: "" })),
          skipDuplicates: true,
        });
        // Señal de reevaluación (decisión: bump fecha_revision + nota; no toca el estado).
        const nota = `${ahora.toISOString().slice(0, 10)} — IA enlazó ${nuevos.length} riesgo(s) nuevo(s); revisar efectividad del control.`;
        await prisma.controlSoa.update({
          where: { id: existing.id },
          data: { fecha_revision: ahora, observaciones: existing.observaciones ? `${existing.observaciones}\n${nota}` : nota },
        });
        enlazados += nuevos.length;
        reevaluar++;
        continue;
      }

      // ── Control nuevo → se crea como 'generado' (pendiente de aceptación) ──
      const soa = await prisma.controlSoa.create({
        data: {
          control_anexo_a_id: cat.id,
          organizacion_id: orgId,
          aplica: true,
          estado: "generado",
          justificacion: c.justificacion,
          justificacion_ia: `${c.justificacion}${c.fuente_referencia ? `\n\nFuente: ${c.fuente_referencia}` : ""}`,
          evidencia: "",
          observaciones: "",
          fecha_revision: ahora,
          origen: "ia",
        },
      });

      const links = riesgoIds.map((riesgo_id) => ({ control_soa_id: soa.id, riesgo_id, tipo_relacion: "mitiga", efectividad_estimada: "media", observaciones: "" }));
      if (links.length > 0) {
        await prisma.riesgoControl.createMany({ data: links, skipDuplicates: true });
      }
      creados++;
    }

    return NextResponse.json({
      creados,
      enlazados,
      reevaluar,
      sugeridos: result.controles.length,
      iso_disponible: result.iso_disponible,
    });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message, waitSeconds: e.waitSeconds }, { status: 429 });
    }
    if (e instanceof AiServiceError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return apiError(e, "No se pudieron sugerir controles");
  }
}
