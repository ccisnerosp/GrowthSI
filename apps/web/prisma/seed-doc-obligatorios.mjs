// Seed del catálogo de información documentada obligatoria de ISO/IEC 27001:2022.
// Tabla GLOBAL (sin organizacion_id). Idempotente: upsert por `codigo`.
//   node prisma/seed-doc-obligatorios.mjs
//
// modulo: dónde se gestiona/evalúa la cobertura:
//   documentos = se redacta como Documento (M2) y se vincula a este ítem.
//   alcance/soa/objetivos/auditorias/nc/riesgos = cubierto automáticamente por ese módulo.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const D = "Documento", R = "Registro";

/** [codigo, clausula, nombre, tipo, modulo, descripcion] */
const ITEMS = [
  ["OBL-4.3",   "4.3",     "Alcance del SGSI", D, "alcance", "Determinación y declaración del alcance del Sistema de Gestión de Seguridad de la Información."],
  ["OBL-5.1",   "5.1",     "Acta de Compromiso de la Dirección respecto del SGSI", D, "documentos", "Declaración formal de la alta dirección que evidencia su liderazgo y compromiso con el establecimiento, implementación, mantenimiento y mejora continua del SGSI."],
  ["OBL-5.2",   "5.2",     "Política de Seguridad de la Información", D, "documentos", "Política de seguridad de la información aprobada por la dirección."],
  ["OBL-6.1.2", "6.1.2",   "Proceso de evaluación de riesgos", D, "documentos", "Metodología y criterios para evaluar los riesgos de seguridad de la información."],
  ["OBL-6.1.3", "6.1.3",   "Proceso de tratamiento de riesgos", D, "documentos", "Proceso para seleccionar opciones de tratamiento y controles de los riesgos."],
  ["OBL-6.1.3d","6.1.3 d)", "Declaración de Aplicabilidad (SoA)", D, "soa", "Controles del Anexo A aplicables, su justificación de inclusión/exclusión y estado."],
  ["OBL-6.1.3e","6.1.3 e)", "Plan de tratamiento de riesgos", D, "documentos", "Plan con acciones, responsables y plazos para tratar los riesgos."],
  ["OBL-6.2",   "6.2",     "Objetivos de seguridad de la información", D, "objetivos", "Objetivos de seguridad de la información y planes para lograrlos."],
  ["OBL-7.2",   "7.2",     "Evidencia de competencia", R, "documentos", "Registros que evidencian la competencia del personal con responsabilidades en el SGSI."],
  ["OBL-8.1",   "8.1",     "Control operacional (información documentada)", R, "documentos", "Información documentada necesaria para confiar en que los procesos se ejecutan según lo planificado."],
  ["OBL-8.2",   "8.2",     "Resultados de la evaluación de riesgos", R, "riesgos", "Registros de los resultados de las evaluaciones de riesgos realizadas."],
  ["OBL-8.3",   "8.3",     "Resultados del tratamiento de riesgos", R, "riesgos", "Registros de los resultados del tratamiento de los riesgos."],
  ["OBL-9.1",   "9.1",     "Resultados de seguimiento y medición", R, "documentos", "Evidencia de los resultados del seguimiento, medición, análisis y evaluación."],
  ["OBL-9.2",   "9.2",     "Programa y resultados de auditoría interna", R, "auditorias", "Programa de auditorías y evidencia de su implementación y resultados."],
  ["OBL-9.3",   "9.3",     "Resultados de la revisión por la dirección", R, "documentos", "Actas/registros de las revisiones del SGSI por la dirección."],
  ["OBL-10.2",  "10.2",    "No conformidades y acciones correctivas", R, "nc", "Registros de las no conformidades, su naturaleza, acciones tomadas y resultados."],
];

async function main() {
  let created = 0, updated = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    const [codigo, clausula, nombre, tipo, modulo, descripcion] = ITEMS[i];
    const existing = await prisma.documentoObligatorio.findUnique({ where: { codigo } });
    await prisma.documentoObligatorio.upsert({
      where: { codigo },
      create: { codigo, clausula, nombre, tipo, modulo, descripcion, orden: i },
      update: { clausula, nombre, tipo, modulo, descripcion, orden: i },
    });
    if (existing) updated++; else created++;
  }
  const total = await prisma.documentoObligatorio.count();
  console.log(`Obligatorios sembrados: ${created} creados, ${updated} actualizados. Total: ${total} (esperado ${ITEMS.length}).`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
