// M3 SoA — listar los 93 controles del Anexo A con su estado en la SoA del tenant.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiRequirePermission } from "@/lib/auth-helpers";

export async function GET() {
  const { error, session } = await apiRequirePermission("control_soa", "read");
  if (error) return error;
  const orgId = session.user.organizacion_id;

  const [catalogo, soaRows] = await Promise.all([
    prisma.controlAnexoA.findMany({
      select: { id: true, codigo: true, nombre: true, dominio: true, descripcion: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.controlSoa.findMany({
      where: { organizacion_id: orgId },
      select: {
        id: true, control_anexo_a_id: true, aplica: true, estado: true,
        justificacion: true, evidencia: true, observaciones: true,
        fecha_revision: true, origen: true, justificacion_ia: true,
        evidencia_documento_id: true,
        evidencia_documento: { select: { id: true, codigo: true, nombre: true } },
        riesgos: { select: { riesgo: { select: { codigo: true } } } },
      },
    }),
  ]);

  const soaByControl = new Map(soaRows.map((s) => [s.control_anexo_a_id, s]));

  const controles = catalogo.map((c) => {
    const s = soaByControl.get(c.id);
    return {
      control: c,
      soa: s
        ? {
            id: s.id, aplica: s.aplica, estado: s.estado,
            justificacion: s.justificacion, evidencia: s.evidencia, observaciones: s.observaciones,
            fecha_revision: s.fecha_revision.toISOString().slice(0, 10),
            origen: s.origen, justificacion_ia: s.justificacion_ia,
            evidencia_documento_id: s.evidencia_documento_id,
            evidencia_documento: s.evidencia_documento,
          }
        : null,
      riesgos: s ? s.riesgos.map((r) => r.riesgo.codigo) : [],
    };
  });

  return NextResponse.json({ controles });
}
