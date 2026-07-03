// Tracking de uso IA + límite de tokens/mes por tenant.

import { prisma } from "@/lib/db";
import { LIMITS, costUsd } from "@/lib/ai/config";

export type Operacion =
  | "embedding"
  | "alcance_preliminar"
  | "plantilla_documento"
  | "sugerir_riesgos"
  | "sugerir_controles"
  | "documento_control";

export class TokenLimitError extends Error {
  status = 429;
  constructor(public used: number, public limit: number) {
    super(`Límite mensual de tokens IA alcanzado (${used.toLocaleString()} / ${limit.toLocaleString()}). Se reinicia el primer día del mes.`);
    this.name = "TokenLimitError";
  }
}

/** Suma tokens consumidos en el mes calendario actual por la organización. */
export async function tokensUsedThisMonth(organizacion_id: number): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const r = await prisma.iaUso.aggregate({
    where: { organizacion_id, created_at: { gte: startOfMonth } },
    _sum: { tokens_input: true, tokens_output: true },
  });
  return (r._sum.tokens_input ?? 0) + (r._sum.tokens_output ?? 0);
}

/** Lanza TokenLimitError si la org ya consumió el cupo mensual. */
export async function assertWithinTokenLimit(organizacion_id: number): Promise<void> {
  const used = await tokensUsedThisMonth(organizacion_id);
  if (used >= LIMITS.maxTokensPerMonthPerTenant) {
    throw new TokenLimitError(used, LIMITS.maxTokensPerMonthPerTenant);
  }
}

/** Registra una llamada IA en la tabla ia_uso. */
export async function recordUsage(params: {
  organizacion_id: number;
  usuario_id: number | null;
  operacion: Operacion;
  modelo: string;
  tokens_input: number;
  tokens_output: number;
}): Promise<void> {
  await prisma.iaUso.create({
    data: {
      organizacion_id: params.organizacion_id,
      usuario_id: params.usuario_id,
      operacion: params.operacion,
      modelo: params.modelo,
      tokens_input: params.tokens_input,
      tokens_output: params.tokens_output,
      costo_usd: costUsd(params.modelo, params.tokens_input, params.tokens_output),
    },
  });
}
