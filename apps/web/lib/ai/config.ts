// Configuración IA del lado web — SOLO constantes y helpers de cálculo.
//
// Tras la migración a 2 servicios, Next.js NO instancia ningún cliente LLM.
// El web solo necesita: los límites que enforce antes de proxyar (token/mes,
// rate limit) y la tabla de precios para registrar costo en ia_uso.
// Las llamadas reales al LLM/embeddings viven en el AI service (Python).

export const LIMITS = {
  maxTokensPerMonthPerTenant: Number(process.env.IA_MAX_TOKENS_PER_MONTH_PER_TENANT || 1_000_000),
  rateLimitSeconds:           Number(process.env.IA_RATE_LIMIT_SECONDS || 5),
};

// Precios USD / 1M tokens (referencia para ia_uso). Si Azure OpenAI cobra
// distinto, ajustar aquí. El modelo "ai-service" agrupa lo facturado por el
// servicio de IA cuando no se discrimina el modelo exacto.
export const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini":            { input: 0.15, output: 0.60 },
  "gpt-4o":                 { input: 2.50, output: 10.0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  "ai-service":             { input: 0.15, output: 0.60 }, // fallback ~gpt-4o-mini
};

export function costUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (tokensIn * p.input + tokensOut * p.output) / 1_000_000;
}
