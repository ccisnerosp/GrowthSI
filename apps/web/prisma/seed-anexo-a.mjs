// Seed del catálogo maestro de los 93 controles del Anexo A (ISO/IEC 27001:2022 /
// NTP-ISO/IEC 27002:2022). Tabla GLOBAL (sin organizacion_id) compartida por todos
// los tenants. Idempotente: upsert por `codigo` (único).
//
//   node prisma/seed-anexo-a.mjs
//
// Temas: A.5 Organizacionales (37), A.6 Personas (8), A.7 Físicos (14), A.8 Tecnológicos (34).

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ORG = "Organizacional", PER = "Personas", FIS = "Físico", TEC = "Tecnológico";

/** [codigo, nombre, dominio, descripcion(propósito)] */
const CONTROLES = [
  // ── A.5 Controles organizacionales (37) ──────────────────────────────
  ["A.5.1",  "Políticas de seguridad de la información", ORG, "Definir, aprobar, publicar y revisar las políticas de seguridad de la información."],
  ["A.5.2",  "Roles y responsabilidades de seguridad de la información", ORG, "Definir y asignar los roles y responsabilidades de seguridad de la información."],
  ["A.5.3",  "Segregación de funciones", ORG, "Separar funciones y áreas de responsabilidad en conflicto para reducir el riesgo de fraude o error."],
  ["A.5.4",  "Responsabilidades de la dirección", ORG, "La dirección exige a todo el personal aplicar la seguridad según las políticas establecidas."],
  ["A.5.5",  "Contacto con las autoridades", ORG, "Mantener contacto con las autoridades pertinentes."],
  ["A.5.6",  "Contacto con grupos de interés especial", ORG, "Mantener contacto con grupos especializados y foros de seguridad."],
  ["A.5.7",  "Inteligencia de amenazas", ORG, "Recopilar y analizar información sobre amenazas para producir inteligencia accionable."],
  ["A.5.8",  "Seguridad de la información en la gestión de proyectos", ORG, "Integrar la seguridad de la información en la gestión de proyectos."],
  ["A.5.9",  "Inventario de información y otros activos asociados", ORG, "Mantener un inventario de información y activos con sus responsables."],
  ["A.5.10", "Uso aceptable de la información y otros activos asociados", ORG, "Establecer reglas de uso aceptable y manejo de la información y los activos."],
  ["A.5.11", "Devolución de activos", ORG, "Asegurar la devolución de activos al término del empleo, contrato o acuerdo."],
  ["A.5.12", "Clasificación de la información", ORG, "Clasificar la información según su criticidad, valor y requisitos legales."],
  ["A.5.13", "Etiquetado de la información", ORG, "Etiquetar la información conforme al esquema de clasificación adoptado."],
  ["A.5.14", "Transferencia de información", ORG, "Proteger la información en su transferencia interna y externa por cualquier medio."],
  ["A.5.15", "Control de acceso", ORG, "Establecer y aplicar reglas de control de acceso a la información y los activos."],
  ["A.5.16", "Gestión de identidades", ORG, "Gestionar el ciclo de vida completo de las identidades."],
  ["A.5.17", "Información de autenticación", ORG, "Controlar la asignación y gestión de la información de autenticación."],
  ["A.5.18", "Derechos de acceso", ORG, "Aprovisionar, revisar, modificar y revocar los derechos de acceso según las políticas."],
  ["A.5.19", "Seguridad de la información en las relaciones con proveedores", ORG, "Gestionar los riesgos de seguridad asociados al uso de productos y servicios de proveedores."],
  ["A.5.20", "Abordar la seguridad de la información en los acuerdos con proveedores", ORG, "Establecer requisitos de seguridad en los acuerdos con cada proveedor."],
  ["A.5.21", "Gestión de la seguridad de la información en la cadena de suministro de TIC", ORG, "Gestionar los riesgos en la cadena de suministro de productos y servicios TIC."],
  ["A.5.22", "Seguimiento, revisión y gestión de cambios de los servicios de proveedores", ORG, "Supervisar, revisar y gestionar los cambios de los servicios de proveedores."],
  ["A.5.23", "Seguridad de la información para el uso de servicios en la nube", ORG, "Gestionar la adquisición, uso y salida de los servicios en la nube según los requisitos de seguridad."],
  ["A.5.24", "Planificación y preparación de la gestión de incidentes de seguridad", ORG, "Planificar y preparar la gestión de incidentes definiendo roles y procesos."],
  ["A.5.25", "Evaluación y decisión sobre eventos de seguridad de la información", ORG, "Evaluar los eventos de seguridad y decidir si se clasifican como incidentes."],
  ["A.5.26", "Respuesta a incidentes de seguridad de la información", ORG, "Responder a los incidentes conforme a los procedimientos documentados."],
  ["A.5.27", "Aprendizaje de los incidentes de seguridad de la información", ORG, "Usar el conocimiento de los incidentes para reforzar los controles."],
  ["A.5.28", "Recopilación de evidencia", ORG, "Identificar, recopilar y preservar la evidencia relacionada con eventos de seguridad."],
  ["A.5.29", "Seguridad de la información durante la disrupción", ORG, "Mantener la seguridad de la información durante interrupciones."],
  ["A.5.30", "Preparación de las TIC para la continuidad del negocio", ORG, "Planificar, implementar y probar la preparación de las TIC para la continuidad."],
  ["A.5.31", "Requisitos legales, estatutarios, reglamentarios y contractuales", ORG, "Identificar y cumplir los requisitos legales, reglamentarios y contractuales."],
  ["A.5.32", "Derechos de propiedad intelectual", ORG, "Proteger los derechos de propiedad intelectual."],
  ["A.5.33", "Protección de registros", ORG, "Proteger los registros frente a pérdida, destrucción, falsificación y acceso no autorizado."],
  ["A.5.34", "Privacidad y protección de datos personales (PII)", ORG, "Cumplir los requisitos de privacidad y protección de datos personales."],
  ["A.5.35", "Revisión independiente de la seguridad de la información", ORG, "Revisar de forma independiente y periódica el enfoque de seguridad de la información."],
  ["A.5.36", "Cumplimiento de políticas, reglas y normas de seguridad de la información", ORG, "Verificar el cumplimiento de las políticas, reglas y normas de seguridad."],
  ["A.5.37", "Procedimientos operativos documentados", ORG, "Documentar y poner a disposición los procedimientos operativos de los recursos de tratamiento."],

  // ── A.6 Controles de personas (8) ────────────────────────────────────
  ["A.6.1",  "Investigación de antecedentes", PER, "Verificar los antecedentes de los candidatos antes y durante el empleo según el riesgo."],
  ["A.6.2",  "Términos y condiciones del empleo", PER, "Incluir las responsabilidades de seguridad en los acuerdos contractuales del personal."],
  ["A.6.3",  "Concienciación, educación y formación en seguridad de la información", PER, "Formar y concienciar al personal en seguridad de la información de forma periódica."],
  ["A.6.4",  "Proceso disciplinario", PER, "Establecer un proceso disciplinario formal ante violaciones de seguridad."],
  ["A.6.5",  "Responsabilidades tras la finalización o cambio del empleo", PER, "Definir y comunicar las responsabilidades de seguridad que permanecen tras el cese o cambio."],
  ["A.6.6",  "Acuerdos de confidencialidad o no divulgación", PER, "Establecer y mantener acuerdos de confidencialidad acordes a las necesidades de la organización."],
  ["A.6.7",  "Trabajo a distancia (teletrabajo)", PER, "Proteger la información accedida, procesada o almacenada fuera de las instalaciones."],
  ["A.6.8",  "Notificación de eventos de seguridad de la información", PER, "Proporcionar un mecanismo para que el personal reporte eventos de seguridad observados."],

  // ── A.7 Controles físicos (14) ───────────────────────────────────────
  ["A.7.1",  "Perímetros de seguridad física", FIS, "Definir y usar perímetros de seguridad para proteger las áreas con información y activos."],
  ["A.7.2",  "Entrada física", FIS, "Proteger las áreas seguras mediante controles de entrada y puntos de acceso."],
  ["A.7.3",  "Seguridad de oficinas, despachos e instalaciones", FIS, "Diseñar e implementar la seguridad física de oficinas, despachos e instalaciones."],
  ["A.7.4",  "Seguimiento de la seguridad física", FIS, "Vigilar continuamente las instalaciones para detectar accesos físicos no autorizados."],
  ["A.7.5",  "Protección contra amenazas físicas y ambientales", FIS, "Proteger contra amenazas físicas y ambientales como desastres naturales y ataques."],
  ["A.7.6",  "Trabajo en áreas seguras", FIS, "Diseñar e implementar medidas para trabajar en áreas seguras."],
  ["A.7.7",  "Escritorio despejado y pantalla despejada", FIS, "Aplicar reglas de escritorio despejado y pantalla despejada."],
  ["A.7.8",  "Ubicación y protección de los equipos", FIS, "Ubicar y proteger los equipos frente a amenazas físicas y ambientales."],
  ["A.7.9",  "Seguridad de los activos fuera de las instalaciones", FIS, "Proteger los activos que operan fuera de las instalaciones de la organización."],
  ["A.7.10", "Soportes de almacenamiento", FIS, "Gestionar los soportes de almacenamiento durante todo su ciclo de vida."],
  ["A.7.11", "Servicios de suministro (utilities)", FIS, "Proteger los recursos frente a fallos de los servicios de suministro (energía, agua, etc.)."],
  ["A.7.12", "Seguridad del cableado", FIS, "Proteger el cableado de energía y telecomunicaciones frente a interceptación o daño."],
  ["A.7.13", "Mantenimiento de los equipos", FIS, "Mantener correctamente los equipos para asegurar su disponibilidad e integridad."],
  ["A.7.14", "Eliminación segura o reutilización de los equipos", FIS, "Verificar la eliminación segura de información antes de desechar o reutilizar equipos."],

  // ── A.8 Controles tecnológicos (34) ──────────────────────────────────
  ["A.8.1",  "Dispositivos finales de usuario", TEC, "Proteger la información en los dispositivos finales de usuario."],
  ["A.8.2",  "Derechos de acceso privilegiado", TEC, "Restringir y gestionar la asignación y uso de los derechos de acceso privilegiado."],
  ["A.8.3",  "Restricción del acceso a la información", TEC, "Restringir el acceso a la información según la política de control de acceso."],
  ["A.8.4",  "Acceso al código fuente", TEC, "Gestionar de forma adecuada el acceso de lectura y escritura al código fuente."],
  ["A.8.5",  "Autenticación segura", TEC, "Implementar tecnologías y procedimientos de autenticación segura."],
  ["A.8.6",  "Gestión de la capacidad", TEC, "Supervisar y ajustar el uso de los recursos según los requisitos de capacidad."],
  ["A.8.7",  "Protección contra el malware", TEC, "Proteger frente a malware con controles técnicos y concienciación del usuario."],
  ["A.8.8",  "Gestión de las vulnerabilidades técnicas", TEC, "Obtener información de vulnerabilidades técnicas y tomar medidas para tratarlas."],
  ["A.8.9",  "Gestión de la configuración", TEC, "Establecer, documentar y supervisar las configuraciones seguras de hardware y software."],
  ["A.8.10", "Eliminación de información", TEC, "Eliminar la información cuando ya no se necesite según los requisitos."],
  ["A.8.11", "Enmascaramiento de datos", TEC, "Usar enmascaramiento de datos según la política de control de acceso."],
  ["A.8.12", "Prevención de fuga de datos", TEC, "Aplicar medidas para prevenir la fuga de datos sensibles."],
  ["A.8.13", "Copia de seguridad de la información", TEC, "Mantener y probar copias de seguridad según la política acordada."],
  ["A.8.14", "Redundancia de las instalaciones de procesamiento de información", TEC, "Implementar redundancia suficiente para cumplir los requisitos de disponibilidad."],
  ["A.8.15", "Registro (logging)", TEC, "Producir, almacenar, proteger y analizar registros de eventos."],
  ["A.8.16", "Actividades de seguimiento (monitoring)", TEC, "Supervisar redes, sistemas y aplicaciones para detectar comportamientos anómalos."],
  ["A.8.17", "Sincronización de relojes", TEC, "Sincronizar los relojes de los sistemas con fuentes de tiempo aprobadas."],
  ["A.8.18", "Uso de programas utilitarios privilegiados", TEC, "Restringir y controlar el uso de utilidades que puedan anular los controles."],
  ["A.8.19", "Instalación de software en sistemas operativos", TEC, "Gestionar de forma segura la instalación de software en sistemas operativos."],
  ["A.8.20", "Seguridad de las redes", TEC, "Proteger y gestionar las redes y los dispositivos de red."],
  ["A.8.21", "Seguridad de los servicios de red", TEC, "Identificar y aplicar los mecanismos de seguridad de los servicios de red."],
  ["A.8.22", "Segregación de redes", TEC, "Segregar grupos de servicios, usuarios y sistemas en las redes."],
  ["A.8.23", "Filtrado web", TEC, "Gestionar el acceso a sitios web externos para reducir la exposición a contenido malicioso."],
  ["A.8.24", "Uso de criptografía", TEC, "Definir e implementar reglas para el uso eficaz de la criptografía y la gestión de claves."],
  ["A.8.25", "Ciclo de vida de desarrollo seguro", TEC, "Establecer y aplicar reglas para el desarrollo seguro de software y sistemas."],
  ["A.8.26", "Requisitos de seguridad de las aplicaciones", TEC, "Identificar, especificar y aprobar los requisitos de seguridad de las aplicaciones."],
  ["A.8.27", "Arquitectura de sistemas seguros y principios de ingeniería", TEC, "Aplicar principios de ingeniería de sistemas seguros en el desarrollo."],
  ["A.8.28", "Codificación segura", TEC, "Aplicar principios de codificación segura en el desarrollo de software."],
  ["A.8.29", "Pruebas de seguridad en el desarrollo y la aceptación", TEC, "Definir e implementar procesos de prueba de seguridad en el ciclo de desarrollo."],
  ["A.8.30", "Desarrollo subcontratado (externalizado)", TEC, "Dirigir, supervisar y revisar las actividades de desarrollo externalizado."],
  ["A.8.31", "Separación de los entornos de desarrollo, prueba y producción", TEC, "Separar y proteger los entornos de desarrollo, prueba y producción."],
  ["A.8.32", "Gestión de cambios", TEC, "Someter los cambios a los recursos de tratamiento a procedimientos de gestión de cambios."],
  ["A.8.33", "Información de prueba", TEC, "Seleccionar, proteger y gestionar adecuadamente la información de prueba."],
  ["A.8.34", "Protección de los sistemas de información durante las pruebas de auditoría", TEC, "Planificar y acordar las pruebas de auditoría sobre sistemas operativos para minimizar el impacto."],
];

async function main() {
  let created = 0, updated = 0;
  for (const [codigo, nombre, dominio, descripcion] of CONTROLES) {
    const existing = await prisma.controlAnexoA.findUnique({ where: { codigo } });
    await prisma.controlAnexoA.upsert({
      where: { codigo },
      create: { codigo, nombre, dominio, descripcion },
      update: { nombre, dominio, descripcion },
    });
    if (existing) updated++; else created++;
  }
  const total = await prisma.controlAnexoA.count();
  console.log(`Anexo A sembrado: ${created} creados, ${updated} actualizados. Total en BD: ${total} (esperado 93).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
