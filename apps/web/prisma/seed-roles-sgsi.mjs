// Seed de roles del SGSI (cláusula 5.3) por organización. Idempotente: upsert por
// (organizacion_id, codigo). Sólo plantilla de roles clave; el titular (usuario_id)
// se asigna luego desde la UI.
//   node prisma/seed-roles-sgsi.mjs

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const IND = "Individual", ORG = "Órgano colegiado";

/** [codigo, nombre, tipo, descripcion, responsabilidades, autoridades] */
const ROLES = [
  ["ROL-001", "Alta Dirección", ORG,
    "Liderazgo y compromiso con el SGSI (cláusula 5.1).",
    "Establecer la política y objetivos de seguridad; asegurar la integración del SGSI en los procesos; proveer recursos; promover la mejora continua; realizar la revisión por la dirección.",
    "Aprobar la política, el alcance y los objetivos del SGSI; asignar roles y autoridades; aprobar el plan de tratamiento de riesgos y aceptar riesgos residuales."],
  ["ROL-002", "CISO / Responsable de Seguridad de la Información", IND,
    "Responsable operativo de la gestión del SGSI.",
    "Coordinar la implementación y mantenimiento del SGSI; gestionar la evaluación y tratamiento de riesgos; mantener la SoA y la documentación; reportar el desempeño del SGSI a la dirección.",
    "Proponer controles y políticas; requerir información a las áreas; coordinar auditorías internas y la gestión de incidentes."],
  ["ROL-003", "Comité de Seguridad de la Información", ORG,
    "Órgano de gobierno y coordinación del SGSI.",
    "Revisar el estado del SGSI; priorizar iniciativas y recursos; supervisar el tratamiento de riesgos y los indicadores; resolver conflictos entre áreas.",
    "Aprobar planes y prioridades de seguridad; escalar decisiones a la Alta Dirección."],
  ["ROL-004", "Propietario de activos", IND,
    "Responsable de uno o varios activos de información.",
    "Clasificar y valorar sus activos; definir y revisar los requisitos de protección; autorizar accesos; mantener actualizado el inventario de sus activos.",
    "Aprobar permisos de acceso a sus activos; solicitar controles adicionales."],
  ["ROL-005", "Propietario de riesgos", IND,
    "Responsable de un riesgo y su tratamiento (cláusula 6.1.2).",
    "Evaluar y mantener actualizados sus riesgos; seleccionar y supervisar las opciones de tratamiento; monitorear el riesgo residual.",
    "Decidir el tratamiento del riesgo dentro del apetito definido; aceptar riesgo residual hasta el umbral delegado."],
  ["ROL-006", "Auditor interno del SGSI", IND,
    "Verificación independiente del SGSI (cláusula 9.2).",
    "Planificar y ejecutar el programa de auditorías internas; documentar hallazgos y no conformidades; verificar la eficacia de las acciones correctivas.",
    "Acceder a evidencias y registros del SGSI; emitir hallazgos y reportar a la dirección con independencia."],
  ["ROL-007", "Administrador de TI / Custodio", IND,
    "Operación y protección técnica de los activos.",
    "Implementar y operar los controles técnicos; aplicar copias de respaldo, parches y endurecimiento; gestionar identidades y accesos; atender incidentes técnicos.",
    "Ejecutar cambios técnicos autorizados; aislar sistemas ante incidentes de seguridad."],
  ["ROL-008", "Oficial de Protección de Datos (DPO)", IND,
    "Cumplimiento en privacidad y datos personales.",
    "Asesorar sobre protección de datos; supervisar el cumplimiento legal; gestionar derechos de los titulares; coordinar evaluaciones de impacto (PIA/DPIA).",
    "Requerir información sobre tratamientos de datos; recomendar la suspensión de tratamientos no conformes."],
];

async function main() {
  const orgs = await prisma.organizacion.findMany({ where: { deleted_at: null }, select: { id: true, codigo: true } });
  if (orgs.length === 0) { console.log("No hay organizaciones. Nada que sembrar."); await prisma.$disconnect(); return; }

  let created = 0, updated = 0;
  for (const org of orgs) {
    for (const [codigo, nombre, tipo, descripcion, responsabilidades, autoridades] of ROLES) {
      const existing = await prisma.rolSgsi.findUnique({ where: { organizacion_id_codigo: { organizacion_id: org.id, codigo } } });
      await prisma.rolSgsi.upsert({
        where: { organizacion_id_codigo: { organizacion_id: org.id, codigo } },
        create: { organizacion_id: org.id, codigo, nombre, tipo, descripcion, responsabilidades, autoridades },
        update: { nombre, tipo, descripcion, responsabilidades, autoridades },
      });
      if (existing) updated++; else created++;
    }
  }
  const total = await prisma.rolSgsi.count();
  console.log(`Roles SGSI sembrados en ${orgs.length} organización(es): ${created} creados, ${updated} actualizados. Total: ${total}.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
