// P2 — Evaluación DETERMINISTA del cumplimiento de objetivos (cláusula 9.1).
// Sin IA: compara el valor medido con la meta (operador + umbral). Compartido por
// la API, la UI del módulo Objetivos y los insumos de la Revisión por la Dirección.

export type Operador = ">=" | "<=" | "=" | ">" | "<";
export const OPERADORES: Operador[] = [">=", "<=", "=", ">", "<"];
export const FRECUENCIAS = ["mensual", "trimestral", "semestral", "anual"];

/** ¿El valor medido satisface la meta? */
export function cumpleMeta(valor: number, operador: string, metaValor: number): boolean {
  switch (operador) {
    case ">=": return valor >= metaValor;
    case "<=": return valor <= metaValor;
    case ">":  return valor > metaValor;
    case "<":  return valor < metaValor;
    case "=":  return valor === metaValor;
    default:   return false;
  }
}

export type Cumplimiento = "cumplido" | "no_cumplido" | "sin_medicion" | "cualitativo";

/**
 * Deriva el estado de cumplimiento de un objetivo a partir de su meta numérica y
 * el último valor medido. Si el objetivo no tiene meta_valor, es cualitativo
 * (se evalúa por el `estado` manual, fuera de esta función).
 */
export function evaluarCumplimiento(
  metaValor: number | null | undefined,
  operador: string,
  ultimoValor: number | null | undefined,
): Cumplimiento {
  if (metaValor == null) return "cualitativo";
  if (ultimoValor == null) return "sin_medicion";
  return cumpleMeta(ultimoValor, operador, metaValor) ? "cumplido" : "no_cumplido";
}

/** Texto legible de la meta numérica (p. ej. "≥ 90 %"). */
export function metaTexto(operador: string, metaValor: number | null | undefined, unidad?: string | null): string {
  if (metaValor == null) return "—";
  const op = ({ ">=": "≥", "<=": "≤", "=": "=", ">": ">", "<": "<" } as Record<string, string>)[operador] ?? operador;
  return `${op} ${metaValor}${unidad ? ` ${unidad}` : ""}`;
}
