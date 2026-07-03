// Cómputo de cobertura del catálogo de información documentada obligatoria
// (ISO/IEC 27001:2022). Puro: recibe catálogo + documentos vinculados + flags de
// módulos y devuelve el estado de cada ítem. Reutilizado por /documentos y /dashboard.

export type ObligatorioItem = {
  id: number; codigo: string; clausula: string; nombre: string; tipo: string; modulo: string; descripcion: string; orden: number;
};
export type DocLink = { id: number; codigo: string; nombre: string; estado: string };
export type ModuleFlags = Record<string, boolean>; // alcance, soa, objetivos, auditorias, nc, riesgos

export type Cobertura = {
  item: ObligatorioItem;
  cubierto: boolean;
  via: "documento" | "modulo" | null;
  documento: DocLink | null;
  estado: string | null; // estado del documento vinculado (borrador/revision/aprobado), si aplica
};

const MODULO_RUTA: Record<string, string> = {
  alcance: "/alcance", soa: "/soa", objetivos: "/alcance", auditorias: "/auditorias", nc: "/nc", riesgos: "/riesgos",
};
export const moduloRuta = (m: string): string => MODULO_RUTA[m] ?? "/dashboard";

export function computeCobertura(catalog: ObligatorioItem[], docsByItem: Map<number, DocLink>, flags: ModuleFlags): Cobertura[] {
  return catalog.map((item) => {
    if (item.modulo === "documentos") {
      const doc = docsByItem.get(item.id) ?? null;
      return { item, cubierto: !!doc, via: doc ? "documento" : null, documento: doc, estado: doc?.estado ?? null };
    }
    const ok = flags[item.modulo] ?? false;
    return { item, cubierto: ok, via: ok ? "modulo" : null, documento: null, estado: null };
  });
}

export function resumenCobertura(cobs: Cobertura[]): { total: number; cubiertos: number; faltantes: number; pct: number } {
  const total = cobs.length;
  const cubiertos = cobs.filter((c) => c.cubierto).length;
  return { total, cubiertos, faltantes: total - cubiertos, pct: total > 0 ? Math.round((cubiertos / total) * 100) : 0 };
}
