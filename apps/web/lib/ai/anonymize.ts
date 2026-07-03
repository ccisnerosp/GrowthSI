// Anonimización de activos de información tipo "Personas" antes de
// vectorizar o inyectar al prompt. Decisión PO #3: anonymización
// (no excluir, no incluir tal cual).
//
// Regla: para registros con tipo='Personas', se reemplaza el nombre
// propio por un placeholder genérico. La fila original en
// activo_informacion conserva el nombre (HU09 lo necesita para el
// inventario formal); solo el texto que viaja al RAG/LLM se anonimiza.

const NOMBRE_PROPIO_RE = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}\b/g;

export function anonymizeActivoPersonas(input: {
  nombre: string;
  tipo: string;
  ubicacion?: string | null;
}): string {
  if (input.tipo !== "Personas") {
    return input.nombre;
  }
  // 1) Si el nombre del activo *es* el nombre propio (ej. "María Soto"), lo
  //    reemplazamos por una descripción genérica de rol.
  // 2) Si contiene un patrón "Personal con conocimiento crítico en X / Nombre Propio",
  //    quitamos el nombre propio pero preservamos el contexto profesional.
  const cleaned = input.nombre.replace(NOMBRE_PROPIO_RE, "[persona anonimizada]");
  // Si tras el regex no quedó nada útil, devolver placeholder + ubicación
  if (!cleaned.replace(/[\s\[\]\-,/]+/g, "").length || cleaned.startsWith("[persona")) {
    return `Personal interno (rol no nominado)${input.ubicacion ? ` ubicado en ${input.ubicacion}` : ""}`;
  }
  return cleaned;
}
