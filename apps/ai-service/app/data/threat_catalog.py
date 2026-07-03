"""Catálogos curados de amenazas para el sugeridor de escenarios de riesgo.

PATRÓN A (RAG local). Estas fuentes alimentan el knowledge base compartido
(`vector_global`). Las entradas están alineadas a las taxonomías reales:

  · base_mitre_attack_enterprise  — MITRE ATT&CK for Enterprise (técnicas reales)
  · base_mitre_attack_social_eng  — MITRE ATT&CK subset Social Eng + Initial Access
  · base_enisa_threat_landscape   — ENISA Threat Landscape 2024 (categorías)
  · base_enisa_amenazas_fisicas   — ENISA Physical & Environmental Threats

La fuente organizacional `base_iso_27005_amenazas` NO está aquí: se ingiere del
PDF real de la ISO/IEC 27005:2022 (ver routers/ingest.py + scripts/seed_threats).

El seeder (scripts/seed_threats.py = "Job B") vectoriza cada `texto` y lo inserta
en vector_global con: fuente = clave de la fuente, seccion = ref,
metadata = { dominio, tipo_contenido, ref }.

Cada entrada conserva el ID/nombre canónico (p. ej. "T1486") para trazabilidad,
y el texto está en español porque el contexto y la salida del sugeridor lo están.
"""

from typing import TypedDict


class ThreatEntry(TypedDict):
    ref: str
    texto: str


class ThreatSource(TypedDict):
    fuente: str
    documento: str
    dominio: str
    tipo_contenido: str
    entries: list[ThreatEntry]


# ── DOMINIO TECNOLÓGICO — MITRE ATT&CK for Enterprise ────────────────────────
_MITRE_ENTERPRISE: list[ThreatEntry] = [
    {"ref": "T1566 — Phishing", "texto": "Phishing: los adversarios envían correos electrónicos fraudulentos con archivos adjuntos o enlaces maliciosos para obtener acceso inicial a los sistemas. Es el vector de entrada más común; explota la confianza del usuario y filtros de correo débiles."},
    {"ref": "T1190 — Exploit Public-Facing Application", "texto": "Explotación de aplicaciones expuestas a internet: el atacante aprovecha vulnerabilidades en servicios web, APIs, servidores o portales públicos (inyección SQL, deserialización, RCE) para comprometer el sistema. Agravado por software sin parches."},
    {"ref": "T1486 — Data Encrypted for Impact (Ransomware)", "texto": "Ransomware: cifrado malicioso de datos y sistemas para interrumpir la operación y exigir rescate. Suele combinarse con exfiltración previa (doble extorsión). Impacta gravemente la disponibilidad de sistemas críticos."},
    {"ref": "T1078 — Valid Accounts", "texto": "Uso de cuentas válidas comprometidas: credenciales legítimas robadas (filtraciones, phishing, fuerza bruta) permiten acceso persistente y evasión de defensas. Se mitiga con MFA y revisión de privilegios."},
    {"ref": "T1110 — Brute Force", "texto": "Fuerza bruta y password spraying contra servicios de autenticación (VPN, RDP, correo, portales). Explota contraseñas débiles o reutilizadas y ausencia de bloqueo por intentos y de MFA."},
    {"ref": "T1059 — Command and Scripting Interpreter", "texto": "Ejecución de comandos y scripts (PowerShell, bash, scripting) para ejecutar cargas maliciosas tras el acceso inicial. Habilita movimiento lateral, persistencia y despliegue de malware."},
    {"ref": "T1133 — External Remote Services", "texto": "Abuso de servicios de acceso remoto externos (VPN, RDP, escritorios remotos) expuestos sin MFA ni segmentación, para obtener o mantener acceso. Frecuente en accesos de proveedores y teletrabajo."},
    {"ref": "T1210 — Exploitation of Remote Services", "texto": "Explotación de vulnerabilidades en servicios de red internos para moverse lateralmente entre hosts (SMB, RPC, servicios de archivos). Aprovecha redes planas sin segmentación y parches atrasados."},
    {"ref": "T1505.003 — Web Shell", "texto": "Instalación de web shells en servidores web comprometidos para mantener acceso persistente y ejecutar comandos remotos. Asociado a aplicaciones web vulnerables y permisos excesivos del servidor."},
    {"ref": "T1499 — Endpoint Denial of Service", "texto": "Denegación de servicio a nivel de endpoint/aplicación: agotamiento de recursos de servidores y aplicaciones que degrada o detiene servicios de negocio."},
    {"ref": "T1498 — Network Denial of Service (DDoS)", "texto": "Denegación de servicio de red (DDoS): saturación del ancho de banda o de la infraestructura para dejar inaccesibles plataformas de operación y servicios en línea."},
    {"ref": "T1003 — OS Credential Dumping", "texto": "Volcado de credenciales del sistema operativo (LSASS, SAM, cachés) para obtener hashes y contraseñas que habilitan escalada de privilegios y movimiento lateral."},
    {"ref": "T1071 — Application Layer Protocol (C2/Exfiltración)", "texto": "Uso de protocolos de capa de aplicación (HTTP/S, DNS) para comando y control y exfiltración de datos camuflados en tráfico legítimo, evadiendo controles perimetrales."},
    {"ref": "T1195 — Supply Chain Compromise", "texto": "Compromiso de la cadena de suministro: inserción de código malicioso en software, librerías o actualizaciones de terceros, comprometiendo a la organización a través de un proveedor de confianza."},
    {"ref": "T1136 — Create Account (Persistencia)", "texto": "Creación de cuentas no autorizadas (locales, de dominio o en la nube) para mantener acceso persistente aun después de remediaciones. Explota falta de monitoreo de altas de cuentas."},
    {"ref": "T1530 — Data from Cloud Storage", "texto": "Acceso a datos en almacenamiento en la nube mal configurado (buckets/contenedores públicos, permisos laxos), provocando exposición o robo de información sensible."},
]

# ── DOMINIO PERSONAS — MITRE ATT&CK Social Engineering + Initial Access ──────
_MITRE_SOCIAL: list[ThreatEntry] = [
    {"ref": "T1566.001 — Spearphishing Attachment", "texto": "Spearphishing con adjunto: correo dirigido a una persona concreta con un archivo malicioso (documento con macros, ejecutable). Explota la confianza y la falta de concienciación del personal clave."},
    {"ref": "T1566.002 — Spearphishing Link", "texto": "Spearphishing con enlace: correo dirigido con un enlace a una página de captura de credenciales o descarga de malware. Vector frecuente de robo de credenciales corporativas."},
    {"ref": "T1566.003 — Spearphishing via Service", "texto": "Spearphishing por servicios de mensajería o redes sociales (LinkedIn, WhatsApp): el atacante contacta al empleado fuera del correo corporativo para evadir filtros y ganar confianza."},
    {"ref": "T1598 — Phishing for Information", "texto": "Phishing para recolección de información: engaño para que la víctima revele datos (credenciales, estructura interna, datos personales) sin entregar malware. Base de ataques posteriores dirigidos."},
    {"ref": "T1656 — Impersonation / Pretexting", "texto": "Suplantación y pretexting: el atacante se hace pasar por una autoridad o área interna (TI, RR.HH., gerencia) mediante un escenario creíble para inducir acciones o divulgación de información."},
    {"ref": "T1534 — Internal Spearphishing", "texto": "Spearphishing interno: tras comprometer una cuenta, el atacante envía correos desde una dirección legítima de la organización para engañar a otros empleados, aprovechando la confianza interna."},
    {"ref": "T1204 — User Execution", "texto": "Ejecución por el usuario: el ataque depende de que un empleado abra un adjunto o ejecute un archivo malicioso. La negligencia o falta de formación incrementa la probabilidad."},
    {"ref": "BEC — Business Email Compromise", "texto": "Compromiso de correo corporativo (BEC): fraude por suplantación de ejecutivos o proveedores para autorizar transferencias o desviar pagos. Explota procesos de aprobación débiles y exceso de confianza."},
    {"ref": "Vishing — Phishing telefónico", "texto": "Vishing: llamadas fraudulentas haciéndose pasar por soporte técnico o bancos para obtener credenciales, códigos MFA o accesos. Ataca el factor humano fuera de los controles técnicos."},
    {"ref": "Insider Threat — Abuso de privilegios", "texto": "Amenaza interna: empleado o contratista con acceso legítimo que, por malicia o negligencia, divulga, altera o sustrae información. Difícil de detectar sin monitoreo de actividad y segregación de funciones."},
    {"ref": "T1078 — Credential Abuse (Personas)", "texto": "Abuso de credenciales por error humano: compartir contraseñas, reutilizarlas o anotarlas, y caer en sitios falsos, entrega accesos a terceros no autorizados. Se mitiga con MFA, gestor de contraseñas y formación."},
    {"ref": "MFA Fatigue — Bombardeo de aprobaciones", "texto": "Fatiga de MFA: el atacante envía múltiples solicitudes de aprobación push hasta que el usuario, agotado o confundido, aprueba el acceso. Explota el comportamiento humano ante notificaciones repetidas."},
]

# ── DOMINIO ORGANIZACIONAL — ENISA Threat Landscape 2024 ─────────────────────
_ENISA_LANDSCAPE: list[ThreatEntry] = [
    {"ref": "ENISA — Ransomware", "texto": "Ransomware: principal amenaza para organizaciones según ENISA, con cifrado y doble extorsión. Interrumpe la operación, daña la reputación y genera costes de recuperación elevados; impacta sectores como transporte y logística."},
    {"ref": "ENISA — Malware", "texto": "Malware: software malicioso (troyanos, loaders, infostealers) que compromete sistemas, roba datos y habilita ataques posteriores. Se propaga por correo, descargas y dispositivos extraíbles."},
    {"ref": "ENISA — Social Engineering", "texto": "Ingeniería social: amenaza transversal donde el phishing y la suplantación son el principal punto de entrada a las organizaciones, explotando el factor humano antes que las defensas técnicas."},
    {"ref": "ENISA — Threats against data", "texto": "Amenazas contra los datos: brechas y fugas de información por accesos no autorizados, errores de configuración o exfiltración. Exponen datos personales y de negocio, con impacto regulatorio (p. ej. Ley 29733)."},
    {"ref": "ENISA — Threats against availability (DDoS)", "texto": "Amenazas contra la disponibilidad: ataques DDoS y de saturación que dejan inaccesibles plataformas y servicios en línea, afectando la continuidad operativa y los compromisos de nivel de servicio (SLA)."},
    {"ref": "ENISA — Internet threats / outages", "texto": "Amenazas a la disponibilidad de internet: cortes, secuestros de rutas (BGP) y caídas de proveedores que interrumpen servicios dependientes de conectividad, incluidas operaciones distribuidas y de flota."},
    {"ref": "ENISA — Information manipulation", "texto": "Manipulación de información: desinformación y alteración de datos que afecta la integridad y la toma de decisiones, así como la reputación de la organización."},
    {"ref": "ENISA — Supply chain attacks", "texto": "Ataques a la cadena de suministro: compromiso a través de proveedores de software o servicios. Un único proveedor afectado puede impactar a múltiples organizaciones cliente."},
    {"ref": "ENISA — Third-party / dependency risk", "texto": "Riesgo de terceros: dependencia de proveedores TI y de datos con controles de seguridad insuficientes o accesos excesivos, que amplían la superficie de ataque y comprometen la confidencialidad."},
    {"ref": "ENISA — Insider threats", "texto": "Amenazas internas: personal o contratistas que, por intención o descuido, provocan incidentes. ENISA destaca su crecimiento y la dificultad de detección sin gobierno de accesos."},
    {"ref": "ENISA — Sectorial targeting (Transporte/Logística)", "texto": "Focalización sectorial: ENISA documenta que el sector de transporte y logística es blanco frecuente de ransomware y ataques a la disponibilidad por su criticidad operativa y cadenas interconectadas."},
    {"ref": "ENISA — Incumplimiento de SLA / proveedores de datos", "texto": "Incumplimiento de obligaciones por proveedores: fallos de un proveedor de datos o servicios que rompen acuerdos de confidencialidad o disponibilidad, causando exposición o interrupción para la organización."},
]

# ── DOMINIO FÍSICO — ENISA Physical & Environmental Threats ──────────────────
_ENISA_FISICAS: list[ThreatEntry] = [
    {"ref": "ENISA Físico — Robo de dispositivos", "texto": "Robo o pérdida de dispositivos: sustracción de laptops, móviles, discos o medios extraíbles con información sensible. Sin cifrado ni borrado remoto, expone datos confidenciales de la organización."},
    {"ref": "ENISA Físico — Acceso físico no autorizado", "texto": "Acceso físico no autorizado a instalaciones, centros de datos o áreas restringidas, permitiendo robo de equipos, conexión de dispositivos maliciosos o consulta de información. Falla por controles de acceso físico débiles."},
    {"ref": "ENISA Físico — Sabotaje / manipulación de hardware", "texto": "Sabotaje y manipulación de equipos: alteración o daño intencional de servidores, redes o dispositivos, e inserción de hardware malicioso (keyloggers, rogue devices) en puertos accesibles."},
    {"ref": "ENISA Físico — Desastres naturales", "texto": "Desastres naturales: inundaciones, sismos, incendios y eventos climáticos que dañan instalaciones e infraestructura TI, afectando la disponibilidad. Requiere continuidad, redundancia y respaldos externos."},
    {"ref": "ENISA Físico — Fallo de suministro eléctrico/HVAC", "texto": "Fallo de servicios de soporte: cortes de energía o fallas de climatización (HVAC) que detienen o degradan los equipos del centro de datos. Sin UPS ni generadores, interrumpe la operación."},
    {"ref": "ENISA Físico — Intercepción física / tapping", "texto": "Intercepción física: conexión no autorizada al cableado de red o de telecomunicaciones para capturar tráfico e información. Explota cableado y racks sin protección física."},
    {"ref": "ENISA Físico — Pérdida de medios extraíbles", "texto": "Pérdida o extravío de medios extraíbles (USB, discos externos, cintas de respaldo) con datos sensibles sin cifrar, provocando exposición o pérdida de información."},
    {"ref": "ENISA Físico — Daño ambiental (agua/fuego/polvo)", "texto": "Daño ambiental: agua, fuego, humedad, polvo o temperatura fuera de rango que deterioran equipos e infraestructura, comprometiendo la disponibilidad e integridad de los activos."},
    {"ref": "ENISA Físico — Tailgating / piggybacking", "texto": "Tailgating: una persona no autorizada sigue a un empleado para ingresar a un área restringida sin autenticarse. Explota la cortesía y la ausencia de esclusas o control de acceso por persona."},
    {"ref": "ENISA Físico — Vandalismo / disturbios", "texto": "Vandalismo y disturbios: daño deliberado a instalaciones o equipos, o interrupciones por eventos externos, que afectan la disponibilidad física de los activos de información."},
]


# NOTA: las fuentes MITRE ATT&CK (enterprise + social) y ENISA Threat Landscape
# ya NO se siembran desde estos catálogos curados: se ingieren COMPLETAS desde
# los archivos oficiales (scripts/seed_mitre_xlsx.py para el workbook ATT&CK y
# /v1/ingest/iso para el PDF de ENISA ETL). Los arrays _MITRE_* y _ENISA_LANDSCAPE
# quedan como respaldo/semilla mínima histórica, pero seed_threats.py solo siembra
# el catálogo físico (no hay documento oficial independiente para ese dominio).
THREAT_SOURCES: list[ThreatSource] = [
    {
        "fuente": "base_enisa_amenazas_fisicas",
        "documento": "ENISA Physical and Environmental Threats",
        "dominio": "fisico",
        "tipo_contenido": "amenaza_fisica",
        "entries": _ENISA_FISICAS,
    },
]

# Mapa de dominio → fuentes offline que lo cubren (matriz acordada con el PO).
#   tecnológico   : MITRE Enterprise  (+ NVD online condicional, ver nvd.py)
#   organizacional: ISO 27005 (PDF real) + ENISA Threat Landscape
#   personas      : solo MITRE Social Eng
#   físico        : solo ENISA Physical
FUENTES_POR_DOMINIO: dict[str, list[str]] = {
    "tecnologico": ["base_mitre_attack_enterprise"],
    "organizacional": ["base_iso_27005_amenazas", "base_enisa_threat_landscape"],
    "personas": ["base_mitre_attack_social_eng"],
    "fisico": ["base_enisa_amenazas_fisicas"],
}

DOMINIOS = ["tecnologico", "organizacional", "personas", "fisico"]
