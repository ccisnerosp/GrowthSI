// Construcción del texto del chunk por entidad — lo que va al embedding.
// Mantiene el chunk pequeño (~50-300 tokens) y semánticamente denso.

import { anonymizeActivoPersonas } from "@/lib/ai/anonymize";

export function chunkForSede(s: {
  codigo: string;
  nombre_sede: string;
  pais_sede: string;
  departamento_sede: string;
  provincia_sede: string;
  distrito_sede: string;
  incluido_alcance: boolean;
}): string {
  return `Sede ${s.codigo} "${s.nombre_sede}" ubicada en ${s.distrito_sede}, ${s.provincia_sede}, ${s.departamento_sede}, ${s.pais_sede}. ${s.incluido_alcance ? "Incluida en el alcance del SGSI." : "Fuera del alcance del SGSI."}`;
}

export function chunkForFactor(f: {
  codigo: string;
  origen: string;
  categoria: string;
  tipo: string;
  descripcion: string;
  impacto: string;
}): string {
  return `Factor ${f.codigo} (${f.origen.toLowerCase()}, ${f.categoria}, tipo: ${f.tipo}, impacto: ${f.impacto}): ${f.descripcion}`;
}

export function chunkForParte(p: {
  codigo: string;
  nombre: string;
  tipo: string;
  expectativas: string;
  requisitos: string;
  relevancia: string;
}): string {
  return `Parte interesada ${p.codigo} "${p.nombre}" (${p.tipo}, relevancia ${p.relevancia}). Expectativas: ${p.expectativas} Requisitos: ${p.requisitos}`;
}

export function chunkForProceso(p: {
  codigo: string;
  nombre: string;
  tipo: string;
  area: string;
  criticidad: string;
  kpis: string;
  descripcion: string;
}): string {
  return `Proceso ${p.codigo} "${p.nombre}" (${p.tipo}, área ${p.area}, criticidad ${p.criticidad}). Descripción: ${p.descripcion} KPIs: ${p.kpis}`;
}

export function chunkForActivo(a: {
  codigo: string;
  nombre: string;
  tipo: string;
  formato: string;
  ubicacion: string;
  clasificacion: string;
  confidencialidad: string;
  integridad: string;
  disponibilidad: string;
  valoracion: string;
  exposicion?: string | null;
}): string {
  // Decisión #3: anonimizar nombre si es activo tipo "Personas"
  const nombreSanitizado = anonymizeActivoPersonas({ nombre: a.nombre, tipo: a.tipo, ubicacion: a.ubicacion });
  const exposicion = a.exposicion ? ` Exposición: ${a.exposicion}.` : "";
  return `Activo ${a.codigo} "${nombreSanitizado}" (tipo ${a.tipo}, formato ${a.formato}). Ubicación: ${a.ubicacion}. Clasificación: ${a.clasificacion}. CID: C=${a.confidencialidad}, I=${a.integridad}, D=${a.disponibilidad}. Valoración: ${a.valoracion}.${exposicion}`;
}

export function chunkForEscenario(e: {
  codigo: string;
  nombre: string;
  dominio?: string | null;
  amenaza: string;
  vulnerabilidad: string;
  descripcion: string;
}): string {
  const dom = e.dominio ? ` [dominio ${e.dominio}]` : "";
  return `Escenario de riesgo ${e.codigo} "${e.nombre}"${dom}. Amenaza: ${e.amenaza}. Vulnerabilidad: ${e.vulnerabilidad}. ${e.descripcion}`.trim();
}

/** Quita etiquetas HTML del cuerpo del documento para vectorizar texto plano. */
function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

export function chunkForDocumento(d: {
  codigo: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  contenido?: string | null;
}): string {
  const cuerpo = stripHtml(d.contenido).slice(0, 2000); // primeros ~500 tokens del cuerpo
  return `Documento ${d.codigo} "${d.nombre}" (tipo ${d.tipo}). ${d.descripcion} ${cuerpo}`.trim();
}
