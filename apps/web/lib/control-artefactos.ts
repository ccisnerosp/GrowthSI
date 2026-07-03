// Mapa control del Anexo A (ISO/IEC 27001:2022) → artefacto/documento esperado
// como evidencia de implementación. 100% determinista (sin IA): orienta al usuario
// sobre QUÉ tipo de documento sustenta el control y permite pre-seleccionar el
// tipo al generar el documento de evidencia. El "tipo" coincide con el enum de
// tipos del módulo Documentos: Política | Procedimiento | Plan | Instructivo |
// Registro | Manual | Control.

export type ArtefactoEsperado = { tipo: string; descripcion: string };

// Override por control específico (los de mayor valor). El resto cae al
// artefacto por tema (prefijo A.5/A.6/A.7/A.8).
const POR_CONTROL: Record<string, ArtefactoEsperado> = {
  "A.5.1":  { tipo: "Política",     descripcion: "Política de seguridad de la información aprobada por la dirección." },
  "A.5.2":  { tipo: "Manual",       descripcion: "Documento de roles y responsabilidades del SGSI (cláusula 5.3)." },
  "A.5.9":  { tipo: "Registro",     descripcion: "Inventario de activos de información asociados." },
  "A.5.10": { tipo: "Política",     descripcion: "Política de uso aceptable de activos e información." },
  "A.5.15": { tipo: "Política",     descripcion: "Política de control de acceso." },
  "A.5.19": { tipo: "Procedimiento",descripcion: "Procedimiento de gestión de seguridad en proveedores." },
  "A.5.24": { tipo: "Plan",         descripcion: "Plan de gestión de incidentes de seguridad." },
  "A.5.26": { tipo: "Procedimiento",descripcion: "Procedimiento de respuesta a incidentes." },
  "A.5.29": { tipo: "Plan",         descripcion: "Plan de continuidad de la seguridad de la información." },
  "A.5.30": { tipo: "Plan",         descripcion: "Plan de preparación TIC para la continuidad del negocio." },
  "A.5.31": { tipo: "Registro",     descripcion: "Registro de requisitos legales, regulatorios y contractuales." },
  "A.6.1":  { tipo: "Procedimiento",descripcion: "Procedimiento de verificación de antecedentes en contratación." },
  "A.6.2":  { tipo: "Registro",     descripcion: "Términos y condiciones de empleo / acuerdos firmados." },
  "A.6.3":  { tipo: "Plan",         descripcion: "Plan/programa de concienciación y formación en seguridad." },
  "A.6.6":  { tipo: "Registro",     descripcion: "Acuerdos de confidencialidad (NDA) suscritos." },
  "A.7.2":  { tipo: "Procedimiento",descripcion: "Procedimiento de controles de acceso físico." },
  "A.8.5":  { tipo: "Política",     descripcion: "Política de autenticación segura / acceso." },
  "A.8.8":  { tipo: "Procedimiento",descripcion: "Procedimiento de gestión de vulnerabilidades técnicas." },
  "A.8.9":  { tipo: "Instructivo",  descripcion: "Línea base de configuración (hardening / benchmark)." },
  "A.8.13": { tipo: "Procedimiento",descripcion: "Procedimiento de copias de respaldo y restauración." },
  "A.8.15": { tipo: "Procedimiento",descripcion: "Procedimiento de registro (logging) y su retención." },
  "A.8.16": { tipo: "Procedimiento",descripcion: "Procedimiento de monitoreo y alerta de actividades." },
  "A.8.24": { tipo: "Política",     descripcion: "Política de uso de criptografía y gestión de claves." },
  "A.8.25": { tipo: "Procedimiento",descripcion: "Procedimiento de ciclo de vida de desarrollo seguro." },
  "A.8.32": { tipo: "Procedimiento",descripcion: "Procedimiento de gestión de cambios." },
};

// Artefacto por defecto según el tema del control (Anexo A 2022).
const POR_TEMA: Record<string, ArtefactoEsperado> = {
  "A.5": { tipo: "Política",     descripcion: "Política o procedimiento organizacional que formaliza el control." },
  "A.6": { tipo: "Procedimiento",descripcion: "Procedimiento o registro de personas que evidencia el control." },
  "A.7": { tipo: "Procedimiento",descripcion: "Procedimiento o instructivo físico/ambiental que evidencia el control." },
  "A.8": { tipo: "Procedimiento",descripcion: "Procedimiento o instructivo técnico que evidencia el control." },
};

const TEMA_FALLBACK: ArtefactoEsperado = {
  tipo: "Procedimiento",
  descripcion: "Documento o registro que evidencie la implementación del control.",
};

/** Artefacto/documento esperado como evidencia del control. */
export function artefactoEsperado(codigo: string): ArtefactoEsperado {
  const exacto = POR_CONTROL[codigo];
  if (exacto) return exacto;
  const tema = codigo.split(".").slice(0, 2).join("."); // "A.8.13" → "A.8"
  return POR_TEMA[tema] ?? TEMA_FALLBACK;
}
