// LogiNorte SAC — sample data for GrowthSI Platform mockups
// Aligned to DB schema (Iteración 4) — only fields present in the schema are exposed.

window.SGSI_DATA = {
  // ── tenant (id, nombre, plan, activo, created_at) ──────────────────
  tenant: {
    id: 1,
    nombre: 'LogiNorte SAC',
    plan: 'Empresa',
    activo: true,
    created_at: '2026-01-08',
  },

  // ── organizacion ───────────────────────────────────────────────────
  // id, tenant_id, codigo, nombre_organizacion, ruc, sector,
  // numero_colaboradores, dominio, mision, vision, estado_sgsi,
  // inicio_proyecto, estado, alcance_sgsi
  organizacion: {
    id: 1,
    tenant_id: 1,
    codigo: 'ORG-001',
    nombre_organizacion: 'LogiNorte SAC',
    ruc: '20512345678',
    sector: 'Logística y transporte',
    numero_colaboradores: 200,
    dominio: 'loginorte.com.pe',
    mision: 'Brindar soluciones integrales de logística y transporte de carga a nivel nacional, garantizando trazabilidad, oportunidad y seguridad de la información de nuestros clientes corporativos.',
    vision: 'Ser para el 2030 el operador logístico más confiable del Perú, certificado en ISO 27001 y referente regional en gestión segura de la cadena de suministro.',
    estado_sgsi: 'Implementación',
    inicio_proyecto: '2026-01-15',
    estado: 'activo',
    alcance_sgsi: 'El SGSI de LogiNorte SAC aplica a los procesos de gestión de transporte y rutas, almacenaje, facturación, atención al cliente y RR.HH., ejecutados desde la Sede Central (San Isidro) y los Centros de Distribución de Callao y Lurín. Se excluye la oficina comercial de Arequipa hasta el siguiente ciclo.',
    criterio_riesgo_p: 10,
    criterio_riesgo_i: 10,
  },

  // ── usuario activo (vista de sesión) — usa campos del esquema ─────
  user: {
    id: 1,
    organizacion_id: 1,
    nombre: 'Andrea Vargas',
    correo: 'andrea.vargas@loginorte.com.pe',
    funcion: 'Oficial de Seguridad de la Información',
    rol: 'Oficial de SI',
    area: 'Seguridad',
    mfa_activo: true,
    estado: 'activo',
    // Aliases legacy para compatibilidad con vistas no migradas (Header, Dashboard, Avatar).
    // En etapa 5 (M6 Usuarios) se eliminarán y se migrarán los lectores.
    get name()     { return this.nombre; },
    get email()    { return this.correo; },
    get role()     { return this.rol; },
    get initials() { return (this.nombre || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); },
  },

  // ── sede ───────────────────────────────────────────────────────────
  // id, organizacion_id, codigo, nombre_sede, pais_sede,
  // departamento_sede, provincia_sede, distrito_sede,
  // incluido_alcance, estado
  sedes: [
    { id: 1, organizacion_id: 1, codigo: 'SED-001', nombre_sede: 'Sede Central',           pais_sede: 'Perú', departamento_sede: 'Lima',     provincia_sede: 'Lima',     distrito_sede: 'San Isidro', incluido_alcance: true,  estado: 'activo' },
    { id: 2, organizacion_id: 1, codigo: 'SED-002', nombre_sede: 'CD Norte',               pais_sede: 'Perú', departamento_sede: 'Callao',   provincia_sede: 'Callao',   distrito_sede: 'Callao',     incluido_alcance: true,  estado: 'activo' },
    { id: 3, organizacion_id: 1, codigo: 'SED-003', nombre_sede: 'CD Sur',                 pais_sede: 'Perú', departamento_sede: 'Lima',     provincia_sede: 'Lima',     distrito_sede: 'Lurín',      incluido_alcance: true,  estado: 'activo' },
    { id: 4, organizacion_id: 1, codigo: 'SED-004', nombre_sede: 'Oficina comercial',      pais_sede: 'Perú', departamento_sede: 'Arequipa', provincia_sede: 'Arequipa', distrito_sede: 'Arequipa',   incluido_alcance: false, estado: 'activo' },
  ],

  // ── factor ─────────────────────────────────────────────────────────
  // id, organizacion_id, codigo, origen, categoria, tipo, descripcion,
  // impacto, estado, fecha_identificacion
  factores: [
    { id: 1,  organizacion_id: 1, codigo: 'F-001', origen: 'Externo', categoria: 'Político-legal', tipo: 'Amenaza',     descripcion: 'Nueva Ley de Protección de Datos Personales (Ley 29733) — multas hasta 100 UIT.',                impacto: 'alto',    estado: 'activo', fecha_identificacion: '2026-02-12' },
    { id: 2,  organizacion_id: 1, codigo: 'F-002', origen: 'Externo', categoria: 'Político-legal', tipo: 'Oportunidad', descripcion: 'Incentivo tributario por certificaciones internacionales (DL 1264).',                              impacto: 'medio',   estado: 'activo', fecha_identificacion: '2026-02-12' },
    { id: 3,  organizacion_id: 1, codigo: 'F-003', origen: 'Externo', categoria: 'Económico',      tipo: 'Amenaza',     descripcion: 'Volatilidad del tipo de cambio afecta licenciamiento en USD.',                                    impacto: 'medio',   estado: 'activo', fecha_identificacion: '2026-02-12' },
    { id: 4,  organizacion_id: 1, codigo: 'F-004', origen: 'Externo', categoria: 'Tecnológico',    tipo: 'Amenaza',     descripcion: 'Aumento del 240% en ataques ransomware al sector logístico LATAM (2025).',                       impacto: 'crítico', estado: 'activo', fecha_identificacion: '2026-02-18' },
    { id: 5,  organizacion_id: 1, codigo: 'F-005', origen: 'Externo', categoria: 'Tecnológico',    tipo: 'Oportunidad', descripcion: 'Adopción de IA generativa para optimización de rutas y automatización.',                          impacto: 'alto',    estado: 'activo', fecha_identificacion: '2026-02-18' },
    { id: 6,  organizacion_id: 1, codigo: 'F-006', origen: 'Externo', categoria: 'Social',         tipo: 'Amenaza',     descripcion: 'Escasez de talento en ciberseguridad en el mercado peruano.',                                     impacto: 'medio',   estado: 'activo', fecha_identificacion: '2026-03-04' },
    { id: 7,  organizacion_id: 1, codigo: 'F-007', origen: 'Externo', categoria: 'Ambiental',      tipo: 'Oportunidad', descripcion: 'Demanda de clientes por trazabilidad y huella de carbono certificada.',                           impacto: 'medio',   estado: 'activo', fecha_identificacion: '2026-03-04' },
    { id: 8,  organizacion_id: 1, codigo: 'F-008', origen: 'Interno', categoria: 'Estructura',     tipo: 'Fortaleza',   descripcion: 'Comité de Seguridad activo desde 2024, reporta directamente a Gerencia General.',                 impacto: 'alto',    estado: 'activo', fecha_identificacion: '2026-02-12' },
    { id: 9,  organizacion_id: 1, codigo: 'F-009', origen: 'Interno', categoria: 'Tecnología',     tipo: 'Fortaleza',   descripcion: 'Migración a Azure AD completada en 100% de usuarios.',                                            impacto: 'alto',    estado: 'activo', fecha_identificacion: '2026-02-12' },
    { id: 10, organizacion_id: 1, codigo: 'F-010', origen: 'Interno', categoria: 'Tecnología',     tipo: 'Debilidad',   descripcion: 'Sistema legacy de gestión de flota (PHP 5.6) sin parches desde 2022.',                            impacto: 'crítico', estado: 'activo', fecha_identificacion: '2026-02-18' },
    { id: 11, organizacion_id: 1, codigo: 'F-011', origen: 'Interno', categoria: 'Procesos',       tipo: 'Debilidad',   descripcion: 'Procedimientos de gestión de incidentes documentados pero no probados.',                          impacto: 'medio',   estado: 'activo', fecha_identificacion: '2026-03-04' },
    { id: 12, organizacion_id: 1, codigo: 'F-012', origen: 'Interno', categoria: 'Personas',       tipo: 'Debilidad',   descripcion: 'Tasa de phishing simulado: 23% (objetivo <10%).',                                                  impacto: 'alto',    estado: 'activo', fecha_identificacion: '2026-03-04' },
    { id: 13, organizacion_id: 1, codigo: 'F-013', origen: 'Interno', categoria: 'Cultura',        tipo: 'Fortaleza',   descripcion: 'Programa de reporte de incidentes con incentivos — 47 reportes en 2025.',                         impacto: 'medio',   estado: 'activo', fecha_identificacion: '2026-03-04' },
  ],

  // ── partes_interesadas ─────────────────────────────────────────────
  // id, organizacion_id, codigo, nombre, tipo, expectativas, requisitos,
  // relevancia, contacto, frecuencia_interaccion, responsable_interno, estado
  partes_interesadas: [
    { id: 1, organizacion_id: 1, codigo: 'PI-001', nombre: 'Clientes corporativos',     tipo: 'Externa', expectativas: 'Trazabilidad de carga, SLA 99.5%, no divulgación de datos comerciales.',                  requisitos: 'Acuerdos de nivel de servicio firmados, reportes mensuales de cumplimiento.',          relevancia: 'alta',   contacto: 'comercial@loginorte.com.pe',     frecuencia_interaccion: 'Mensual',    responsable_interno: 'María Soto',     estado: 'activa' },
    { id: 2, organizacion_id: 1, codigo: 'PI-002', nombre: 'SUNAT',                     tipo: 'Externa', expectativas: 'Cumplimiento de facturación electrónica y libros digitales.',                              requisitos: 'Resoluciones de Superintendencia vigentes, declaraciones mensuales.',                  relevancia: 'alta',   contacto: 'orientacion@sunat.gob.pe',       frecuencia_interaccion: 'Mensual',    responsable_interno: 'Rosa Huamán',    estado: 'activa' },
    { id: 3, organizacion_id: 1, codigo: 'PI-003', nombre: 'MTC (Min. Transportes)',    tipo: 'Externa', expectativas: 'Reportes regulatorios, GPS activo en flota.',                                                requisitos: 'DS 017-2009-MTC, registros de SOAT y revisiones técnicas vigentes.',                   relevancia: 'media',  contacto: 'consultas@mtc.gob.pe',           frecuencia_interaccion: 'Trimestral', responsable_interno: 'Luis Mendoza',   estado: 'activa' },
    { id: 4, organizacion_id: 1, codigo: 'PI-004', nombre: 'Conductores y operarios',   tipo: 'Interna', expectativas: 'Acceso confiable a apps móviles, capacitación.',                                            requisitos: 'Equipos provistos, conectividad estable, manuales operativos.',                        relevancia: 'media',  contacto: 'operaciones@loginorte.com.pe',   frecuencia_interaccion: 'Diaria',     responsable_interno: 'José Quispe',    estado: 'activa' },
    { id: 5, organizacion_id: 1, codigo: 'PI-005', nombre: 'Accionistas',               tipo: 'Interna', expectativas: 'Reducción de riesgo, certificación ISO 27001.',                                             requisitos: 'Informes de resultados trimestrales, reporte de incidentes críticos.',                 relevancia: 'alta',   contacto: 'directorio@loginorte.com.pe',    frecuencia_interaccion: 'Trimestral', responsable_interno: 'Andrea Vargas',  estado: 'activa' },
    { id: 6, organizacion_id: 1, codigo: 'PI-006', nombre: 'Proveedores TI',            tipo: 'Externa', expectativas: 'Acuerdos de nivel de servicio, intercambio seguro.',                                       requisitos: 'NDA firmado, cumplimiento de baseline de seguridad acordado.',                         relevancia: 'media',  contacto: 'soporte@partner.tld',            frecuencia_interaccion: 'Quincenal',  responsable_interno: 'Luis Mendoza',   estado: 'activa' },
  ],

  // ── proceso ────────────────────────────────────────────────────────
  // id, organizacion_id, codigo, nombre, tipo, area, criticidad, kpis,
  // descripcion, incluido_alcance, estado
  procesos: [
    { id: 1, organizacion_id: 1, codigo: 'PR-OP-001',  nombre: 'Gestión de transporte y rutas',      tipo: 'Misional',    area: 'Operaciones', criticidad: 'alta',  kpis: 'SLA de entrega 99.5%; tiempo de ciclo promedio 36h.',  descripcion: 'Planificación, ejecución y seguimiento de servicios de transporte de carga a clientes corporativos.', incluido_alcance: true,  estado: 'operativo' },
    { id: 2, organizacion_id: 1, codigo: 'PR-OP-002',  nombre: 'Almacenaje y logística inversa',     tipo: 'Misional',    area: 'Operaciones', criticidad: 'alta',  kpis: 'Exactitud de inventario 99.2%; rotación 14 días.',     descripcion: 'Recepción, almacenamiento, picking, despacho y gestión de devoluciones.',                              incluido_alcance: true,  estado: 'operativo' },
    { id: 3, organizacion_id: 1, codigo: 'PR-FIN-001', nombre: 'Facturación y cobranzas',            tipo: 'Misional',    area: 'Finanzas',    criticidad: 'media', kpis: 'DSO 32 días; tasa de error en facturación <1%.',       descripcion: 'Emisión de comprobantes electrónicos, conciliación de pagos y gestión de cobranzas.',                  incluido_alcance: true,  estado: 'operativo' },
    { id: 4, organizacion_id: 1, codigo: 'PR-COM-001', nombre: 'Atención al cliente',                tipo: 'Misional',    area: 'Comercial',   criticidad: 'media', kpis: 'NPS ≥ 60; tiempo medio de resolución < 24h.',          descripcion: 'Gestión de consultas, reclamos y postventa a través de canales multicontacto.',                        incluido_alcance: true,  estado: 'operativo' },
    { id: 5, organizacion_id: 1, codigo: 'PR-RH-001',  nombre: 'Gestión de RR.HH.',                  tipo: 'Soporte',     area: 'RR.HH.',      criticidad: 'media', kpis: 'Rotación voluntaria <12%; capacitación anual ≥ 24h.',  descripcion: 'Reclutamiento, contratación, evaluación, capacitación y desvinculación de personal.',                  incluido_alcance: true,  estado: 'operativo' },
    { id: 6, organizacion_id: 1, codigo: 'PR-TI-001',  nombre: 'Gestión de servicios TI',            tipo: 'Soporte',     area: 'TI',          criticidad: 'alta',  kpis: 'Disponibilidad de servicios 99.5%; MTTR < 4h.',        descripcion: 'Operación, mantenimiento y soporte de plataformas tecnológicas que dan servicio al negocio.',          incluido_alcance: true,  estado: 'operativo' },
    { id: 7, organizacion_id: 1, codigo: 'PR-MK-001',  nombre: 'Marketing y publicidad',             tipo: 'Estratégico', area: 'Comercial',   criticidad: 'baja',  kpis: 'Lead generation; ROAS campañas digitales.',            descripcion: 'Posicionamiento de marca, generación de demanda y gestión de campañas digitales.',                     incluido_alcance: false, estado: 'operativo' },
  ],

  // ── activo_informacion ─────────────────────────────────────────────
  // id, organizacion_id, codigo, nombre, tipo, formato, ubicacion,
  // clasificacion, confidencialidad, integridad, disponibilidad,
  // valoracion, estado, modelo, version, proveedor
  activos: [
    { id: 1,  organizacion_id: 1, codigo: 'AI-001', nombre: 'Base de datos de clientes',           tipo: 'Información', formato: 'Digital', ubicacion: 'Azure SQL — East US 2',          clasificacion: 'Confidencial', confidencialidad: 'alta',  integridad: 'alta',  disponibilidad: 'media', valoracion: 'crítico', estado: 'operativo', modelo: 'Azure SQL Database',           version: '12.0',       proveedor: 'Microsoft Azure' },
    { id: 2,  organizacion_id: 1, codigo: 'AI-002', nombre: 'Información de RR.HH. y planillas',   tipo: 'Información', formato: 'Digital', ubicacion: 'SharePoint — Tenant LogiNorte', clasificacion: 'Confidencial', confidencialidad: 'alta',  integridad: 'alta',  disponibilidad: 'media', valoracion: 'crítico', estado: 'operativo', modelo: 'SharePoint Online',            version: '—',          proveedor: 'Microsoft 365' },
    { id: 3,  organizacion_id: 1, codigo: 'AI-003', nombre: 'Manifiestos y guías de remisión',     tipo: 'Información', formato: 'Mixto',   ubicacion: 'TMS / archivo físico CD Callao', clasificacion: 'Restringido',  confidencialidad: 'media', integridad: 'alta',  disponibilidad: 'alta',  valoracion: 'alto',    estado: 'operativo', modelo: '—',                            version: '—',          proveedor: 'Interno' },
    { id: 4,  organizacion_id: 1, codigo: 'AI-004', nombre: 'Sistema WMS (almacén)',               tipo: 'Software',    formato: 'Digital', ubicacion: 'On-prem CD Callao',              clasificacion: 'Restringido',  confidencialidad: 'media', integridad: 'alta',  disponibilidad: 'alta',  valoracion: 'alto',    estado: 'operativo', modelo: 'Manhattan WMS',                version: '2024.1',     proveedor: 'Manhattan Associates' },
    { id: 5,  organizacion_id: 1, codigo: 'AI-005', nombre: 'Sistema TMS (transporte)',            tipo: 'Software',    formato: 'Digital', ubicacion: 'Azure App Service',              clasificacion: 'Restringido',  confidencialidad: 'media', integridad: 'alta',  disponibilidad: 'alta',  valoracion: 'crítico', estado: 'operativo', modelo: 'TMS Cloud',                    version: '3.4.2',      proveedor: 'Oracle' },
    { id: 6,  organizacion_id: 1, codigo: 'AI-006', nombre: 'CRM y tickets de soporte',            tipo: 'Software',    formato: 'Digital', ubicacion: 'SaaS — HubSpot',                 clasificacion: 'Restringido',  confidencialidad: 'media', integridad: 'media', disponibilidad: 'media', valoracion: 'medio',   estado: 'operativo', modelo: 'HubSpot Service Hub',          version: 'Cloud 2026', proveedor: 'HubSpot Inc.' },
    { id: 7,  organizacion_id: 1, codigo: 'AI-007', nombre: 'Flota vehicular con GPS',             tipo: 'Hardware',    formato: 'Físico',  ubicacion: 'CD Callao / CD Lurín',           clasificacion: 'Interno',      confidencialidad: 'baja',  integridad: 'alta',  disponibilidad: 'alta',  valoracion: 'alto',    estado: 'operativo', modelo: 'Volvo FH / Hino 500',          version: 'Flota 2024', proveedor: 'Volvo / Hino' },
    { id: 8,  organizacion_id: 1, codigo: 'AI-008', nombre: 'ERP SAP Business One',                tipo: 'Software',    formato: 'Digital', ubicacion: 'On-prem Sede Central',           clasificacion: 'Confidencial', confidencialidad: 'alta',  integridad: 'alta',  disponibilidad: 'alta',  valoracion: 'crítico', estado: 'operativo', modelo: 'SAP Business One',             version: '10.0 SP 04', proveedor: 'SAP' },
    { id: 9,  organizacion_id: 1, codigo: 'AI-009', nombre: 'Personal con conocimiento clave',     tipo: 'Personas',    formato: 'N/A',     ubicacion: 'Sede Central',                   clasificacion: 'Interno',      confidencialidad: 'media', integridad: 'alta',  disponibilidad: 'media', valoracion: 'alto',    estado: 'operativo', modelo: '—',                            version: '—',          proveedor: 'Interno' },
    { id: 10, organizacion_id: 1, codigo: 'AI-010', nombre: 'Servidor de respaldos',               tipo: 'Hardware',    formato: 'Físico',  ubicacion: 'Sala TI — Sede Central',         clasificacion: 'Restringido',  confidencialidad: 'media', integridad: 'alta',  disponibilidad: 'alta',  valoracion: 'alto',    estado: 'operativo', modelo: 'Dell PowerEdge R750',          version: 'Gen 15',     proveedor: 'Dell Technologies' },
  ],

  // ── proceso_activo (M:N) ───────────────────────────────────────────
  // activo_informacion_id, proceso_id, tipo_relacion, criticidad_relacion
  proceso_activo: [
    { activo_informacion_id: 3,  proceso_id: 1, tipo_relacion: 'utiliza',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 5,  proceso_id: 1, tipo_relacion: 'soporta',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 7,  proceso_id: 1, tipo_relacion: 'utiliza',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 4,  proceso_id: 2, tipo_relacion: 'soporta',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 5,  proceso_id: 2, tipo_relacion: 'utiliza',  criticidad_relacion: 'media' },
    { activo_informacion_id: 1,  proceso_id: 3, tipo_relacion: 'utiliza',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 8,  proceso_id: 3, tipo_relacion: 'soporta',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 1,  proceso_id: 4, tipo_relacion: 'utiliza',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 6,  proceso_id: 4, tipo_relacion: 'soporta',  criticidad_relacion: 'media' },
    { activo_informacion_id: 2,  proceso_id: 5, tipo_relacion: 'soporta',  criticidad_relacion: 'alta' },
    { activo_informacion_id: 9,  proceso_id: 5, tipo_relacion: 'utiliza',  criticidad_relacion: 'media' },
    { activo_informacion_id: 5,  proceso_id: 6, tipo_relacion: 'opera',    criticidad_relacion: 'alta' },
    { activo_informacion_id: 7,  proceso_id: 6, tipo_relacion: 'soporta',  criticidad_relacion: 'media' },
    { activo_informacion_id: 10, proceso_id: 6, tipo_relacion: 'soporta',  criticidad_relacion: 'alta' },
  ],

  // ═════════════════════════════════════════════════════════════════
  // ↓↓↓ ETAPAS 2-5: datos transitorios — se alinearán al esquema  ↓↓↓
  // ═════════════════════════════════════════════════════════════════

  // ISO 27001:2022 Anexo A — catálogo (controles_anexo_a) + SoA por organización (control_soa)
  annexA: {
    themes: [
      { id: 'A.5', name: 'Organizacionales', count: 37, color: 'amber' },
      { id: 'A.6', name: 'Personas', count: 8, color: 'rose' },
      { id: 'A.7', name: 'Físicos', count: 14, color: 'sky' },
      { id: 'A.8', name: 'Tecnológicos', count: 34, color: 'emerald' },
    ],
    // controls: legacy view — generado al final del archivo uniendo
    // controles_anexo_a + control_soa. Se preserva para la UI actual.
  },

  // controles_anexo_a — SQL: id, codigo, nombre, dominio, descripcion
  controles_anexo_a: [
    { id:  1, codigo: 'A.5.1',  nombre: 'Políticas de seguridad de la información',          dominio: 'A.5', descripcion: 'La organización define, aprueba, publica y revisa políticas de seguridad de la información.' },
    { id:  2, codigo: 'A.5.2',  nombre: 'Roles y responsabilidades de SI',                   dominio: 'A.5', descripcion: 'Asignación formal de roles y responsabilidades de seguridad de la información.' },
    { id:  3, codigo: 'A.5.7',  nombre: 'Inteligencia de amenazas',                          dominio: 'A.5', descripcion: 'Recopilación y análisis de inteligencia sobre amenazas relevantes.' },
    { id:  4, codigo: 'A.5.9',  nombre: 'Inventario de información y otros activos asociados', dominio: 'A.5', descripcion: 'Inventario actualizado de información y activos asociados con propietario identificado.' },
    { id:  5, codigo: 'A.5.15', nombre: 'Control de acceso',                                 dominio: 'A.5', descripcion: 'Reglas formales para controlar el acceso físico y lógico a información y activos.' },
    { id:  6, codigo: 'A.5.23', nombre: 'Seguridad de la información en uso de servicios en la nube', dominio: 'A.5', descripcion: 'Procesos para adquisición, uso, gestión y salida de servicios en la nube.' },
    { id:  7, codigo: 'A.5.30', nombre: 'Preparación TIC para continuidad de negocio',       dominio: 'A.5', descripcion: 'Planificación, implementación y prueba de TIC para continuidad.' },
    { id:  8, codigo: 'A.6.1',  nombre: 'Selección (screening)',                             dominio: 'A.6', descripcion: 'Verificación de antecedentes del personal previo y durante el empleo.' },
    { id:  9, codigo: 'A.6.3',  nombre: 'Concienciación, educación y formación en SI',       dominio: 'A.6', descripcion: 'Programa continuo de concienciación y formación apropiada al rol.' },
    { id: 10, codigo: 'A.6.7',  nombre: 'Trabajo remoto',                                    dominio: 'A.6', descripcion: 'Medidas de seguridad para proteger información accedida o tratada de forma remota.' },
    { id: 11, codigo: 'A.7.1',  nombre: 'Perímetros de seguridad física',                    dominio: 'A.7', descripcion: 'Perímetros físicos definidos para proteger áreas con información sensible.' },
    { id: 12, codigo: 'A.7.4',  nombre: 'Monitorización de seguridad física',                dominio: 'A.7', descripcion: 'Monitorización continua de los locales para detectar accesos no autorizados.' },
    { id: 13, codigo: 'A.7.10', nombre: 'Soportes de almacenamiento',                        dominio: 'A.7', descripcion: 'Gestión segura del ciclo de vida de soportes de almacenamiento.' },
    { id: 14, codigo: 'A.8.1',  nombre: 'Dispositivos endpoint de usuario',                  dominio: 'A.8', descripcion: 'Protección de dispositivos endpoint que almacenan o procesan información.' },
    { id: 15, codigo: 'A.8.5',  nombre: 'Autenticación segura',                              dominio: 'A.8', descripcion: 'Mecanismos de autenticación robustos para acceso a sistemas.' },
    { id: 16, codigo: 'A.8.7',  nombre: 'Protección contra malware',                         dominio: 'A.8', descripcion: 'Controles de detección, prevención y recuperación contra malware.' },
    { id: 17, codigo: 'A.8.8',  nombre: 'Gestión de vulnerabilidades técnicas',              dominio: 'A.8', descripcion: 'Identificación y gestión oportuna de vulnerabilidades técnicas.' },
    { id: 18, codigo: 'A.8.9',  nombre: 'Gestión de configuración',                          dominio: 'A.8', descripcion: 'Gestión segura de configuraciones de hardware, software, servicios y redes.' },
    { id: 19, codigo: 'A.8.12', nombre: 'Prevención de fuga de datos (DLP)',                 dominio: 'A.8', descripcion: 'Medidas para prevenir fuga de datos en sistemas, redes y dispositivos.' },
    { id: 20, codigo: 'A.8.13', nombre: 'Copia de seguridad de la información',              dominio: 'A.8', descripcion: 'Copias de seguridad de información, software y sistemas conforme a la política.' },
    { id: 21, codigo: 'A.8.15', nombre: 'Registro (logging)',                                dominio: 'A.8', descripcion: 'Registro de eventos relevantes y revisión periódica de logs.' },
    { id: 22, codigo: 'A.8.16', nombre: 'Actividades de monitorización',                     dominio: 'A.8', descripcion: 'Monitorización de redes, sistemas y aplicaciones para detectar incidentes.' },
    { id: 23, codigo: 'A.8.23', nombre: 'Filtrado web',                                      dominio: 'A.8', descripcion: 'Gestión de acceso a sitios web externos para reducir exposición.' },
    { id: 24, codigo: 'A.8.24', nombre: 'Uso de criptografía',                               dominio: 'A.8', descripcion: 'Uso adecuado y eficaz de criptografía para proteger información.' },
    { id: 25, codigo: 'A.8.28', nombre: 'Codificación segura',                               dominio: 'A.8', descripcion: 'Aplicación de principios de codificación segura en el desarrollo de software.' },
    { id: 26, codigo: 'A.8.32', nombre: 'Gestión de cambios',                                dominio: 'A.8', descripcion: 'Procesos formales de control de cambios para reducir el impacto en SI.' },
  ],

  // control_soa — SQL: id, aplica, estado, justificacion, evidencia,
  // observaciones, fecha_revision. Relación con controles_anexo_a por id
  // (control_anexo_a_id) y con organizacion a nivel app (multitenant).
  control_soa: [
    { id:  1, organizacion_id: 1, control_anexo_a_id:  1, aplica: true,  estado: 'implementado', justificacion: 'Política aprobada por Gerencia General el 12-Mar-2026.', evidencia: 'POL-SGSI-001 v2.1',         observaciones: 'Revisión anual programada.',                 fecha_revision: '2026-03-12', owner: 'A. Vargas' },
    { id:  2, organizacion_id: 1, control_anexo_a_id:  2, aplica: true,  estado: 'implementado', justificacion: 'Matriz RACI aprobada y publicada en intranet.',         evidencia: 'Matriz RACI v1.0',          observaciones: '',                                           fecha_revision: '2026-02-20', owner: 'RR.HH.' },
    { id:  3, organizacion_id: 1, control_anexo_a_id:  3, aplica: true,  estado: 'parcial',      justificacion: 'Suscripción a feeds de CERT.PE en evaluación.',         evidencia: '',                          observaciones: 'Definir SLAs internos para feed.',           fecha_revision: '2026-04-05', owner: 'TI / SOC' },
    { id:  4, organizacion_id: 1, control_anexo_a_id:  4, aplica: true,  estado: 'implementado', justificacion: 'CMDB integrada con flota y almacenes.',                 evidencia: 'CMDB ServiceNow',           observaciones: '',                                           fecha_revision: '2026-04-12', owner: 'TI' },
    { id:  5, organizacion_id: 1, control_anexo_a_id:  5, aplica: true,  estado: 'implementado', justificacion: 'Política RBAC + revisión trimestral.',                  evidencia: 'POL-CTL-002 v1.4',          observaciones: '',                                           fecha_revision: '2026-03-30', owner: 'TI' },
    { id:  6, organizacion_id: 1, control_anexo_a_id:  6, aplica: true,  estado: 'parcial',      justificacion: 'Migración Azure en curso; baseline CIS pendiente.',     evidencia: '',                          observaciones: 'Plan CIS Q2 2026.',                          fecha_revision: '2026-04-20', owner: 'TI / Cloud' },
    { id:  7, organizacion_id: 1, control_anexo_a_id:  7, aplica: true,  estado: 'planificado',  justificacion: 'BCP 2026 en redacción; pruebas en Q3.',                 evidencia: 'PLN-CON-001 v0.6',          observaciones: '',                                           fecha_revision: '2026-04-28', owner: 'Operaciones' },
    { id:  8, organizacion_id: 1, control_anexo_a_id:  8, aplica: true,  estado: 'implementado', justificacion: 'Background check obligatorio para roles críticos.',    evidencia: 'Procedimiento RR.HH. v3.0', observaciones: '',                                           fecha_revision: '2026-02-15', owner: 'RR.HH.' },
    { id:  9, organizacion_id: 1, control_anexo_a_id:  9, aplica: true,  estado: 'implementado', justificacion: 'Plan anual + phishing simulado mensual.',               evidencia: 'Programa LMS 2026',         observaciones: '',                                           fecha_revision: '2026-04-30', owner: 'RR.HH. / SI' },
    { id: 10, organizacion_id: 1, control_anexo_a_id: 10, aplica: true,  estado: 'implementado', justificacion: 'Política de teletrabajo + VPN obligatoria.',           evidencia: 'POL-TR-003 v1.2',           observaciones: '',                                           fecha_revision: '2026-03-22', owner: 'TI' },
    { id: 11, organizacion_id: 1, control_anexo_a_id: 11, aplica: true,  estado: 'implementado', justificacion: 'Centros de distribución con control biométrico.',      evidencia: 'Acta inspección SeFis',     observaciones: '',                                           fecha_revision: '2026-04-02', owner: 'Seg. Física' },
    { id: 12, organizacion_id: 1, control_anexo_a_id: 12, aplica: true,  estado: 'implementado', justificacion: 'CCTV 24/7 en almacenes y patios de carga.',            evidencia: 'Reporte CCTV Q1',           observaciones: '',                                           fecha_revision: '2026-04-02', owner: 'Seg. Física' },
    { id: 13, organizacion_id: 1, control_anexo_a_id: 13, aplica: true,  estado: 'parcial',      justificacion: 'Procedimiento de borrado seguro en revisión.',         evidencia: '',                          observaciones: 'Pendiente aprobación CSI.',                  fecha_revision: '2026-04-10', owner: 'TI' },
    { id: 14, organizacion_id: 1, control_anexo_a_id: 14, aplica: true,  estado: 'implementado', justificacion: 'EDR desplegado en 100% de laptops corporativas.',     evidencia: 'Reporte Defender',          observaciones: '',                                           fecha_revision: '2026-04-26', owner: 'TI' },
    { id: 15, organizacion_id: 1, control_anexo_a_id: 15, aplica: true,  estado: 'implementado', justificacion: 'MFA obligatorio en Azure AD para todos los usuarios.', evidencia: 'Azure AD policy',           observaciones: '',                                           fecha_revision: '2026-04-26', owner: 'TI' },
    { id: 16, organizacion_id: 1, control_anexo_a_id: 16, aplica: true,  estado: 'implementado', justificacion: 'Microsoft Defender for Endpoint en toda la flota.',    evidencia: 'Defender ATP report',       observaciones: '',                                           fecha_revision: '2026-04-26', owner: 'TI / SOC' },
    { id: 17, organizacion_id: 1, control_anexo_a_id: 17, aplica: true,  estado: 'parcial',      justificacion: 'Gestión de vulnerabilidades en curso (Qualys).',       evidencia: 'Qualys dashboard',          observaciones: 'Servidor legacy fuera de cobertura.',        fecha_revision: '2026-04-15', owner: 'TI' },
    { id: 18, organizacion_id: 1, control_anexo_a_id: 18, aplica: true,  estado: 'parcial',      justificacion: 'Baselines CIS aplicados a 65% de servidores.',         evidencia: '',                          observaciones: 'Cobertura objetivo 100% Q3.',                fecha_revision: '2026-04-15', owner: 'TI' },
    { id: 19, organizacion_id: 1, control_anexo_a_id: 19, aplica: true,  estado: 'planificado',  justificacion: 'Piloto Microsoft Purview en Q2 2026.',                  evidencia: '',                          observaciones: '',                                           fecha_revision: '2026-04-30', owner: 'TI' },
    { id: 20, organizacion_id: 1, control_anexo_a_id: 20, aplica: true,  estado: 'parcial',      justificacion: 'Backups configurados; restauración no probada.',       evidencia: 'INS-BCK-014 v2.3',          observaciones: 'Programar prueba en mayo 2026.',             fecha_revision: '2026-04-10', owner: 'TI' },
    { id: 21, organizacion_id: 1, control_anexo_a_id: 21, aplica: true,  estado: 'implementado', justificacion: 'SIEM Sentinel con retención 12 meses.',                evidencia: 'Sentinel workspace',        observaciones: '',                                           fecha_revision: '2026-04-26', owner: 'SOC' },
    { id: 22, organizacion_id: 1, control_anexo_a_id: 22, aplica: true,  estado: 'implementado', justificacion: 'SOC tercerizado 24/7 con SLA <30min.',                 evidencia: 'Contrato SOC',              observaciones: '',                                           fecha_revision: '2026-04-26', owner: 'SOC' },
    { id: 23, organizacion_id: 1, control_anexo_a_id: 23, aplica: true,  estado: 'implementado', justificacion: 'Cisco Umbrella desplegado.',                            evidencia: 'Umbrella console',          observaciones: '',                                           fecha_revision: '2026-04-26', owner: 'TI' },
    { id: 24, organizacion_id: 1, control_anexo_a_id: 24, aplica: true,  estado: 'implementado', justificacion: 'PKI interna + TLS 1.3 obligatorio.',                   evidencia: 'POL-CRP-005 v1.1',          observaciones: '',                                           fecha_revision: '2026-04-26', owner: 'TI' },
    { id: 25, organizacion_id: 1, control_anexo_a_id: 25, aplica: false, estado: 'no_aplica',    justificacion: 'No se desarrolla software a medida en el alcance.',    evidencia: 'Acta de exclusión',         observaciones: '',                                           fecha_revision: '2026-03-01', owner: '—' },
    { id: 26, organizacion_id: 1, control_anexo_a_id: 26, aplica: true,  estado: 'implementado', justificacion: 'CAB semanal + ServiceNow Change.',                     evidencia: 'PRO-CMB-003 v2.0',          observaciones: '',                                           fecha_revision: '2026-04-20', owner: 'TI' },
  ],

  // ── documento ─────────────────────────────────────────────────────
  // id, organizacion_id, codigo, nombre, tipo, obligatorio, descripcion,
  // version, archivo_url, estado
  documentos: [
    { id: 1,  organizacion_id: 1, codigo: 'POL-SGSI-001', nombre: 'Política de Seguridad de la Información',         tipo: 'Política',     obligatorio: true,  descripcion: 'Define el marco, principios y compromisos de la organización en materia de SI.',               version: '2.1', archivo_url: null, estado: 'aprobado' },
    { id: 2,  organizacion_id: 1, codigo: 'POL-CTL-002',  nombre: 'Política de Control de Acceso',                   tipo: 'Política',     obligatorio: true,  descripcion: 'Establece las reglas RBAC y los mecanismos de autenticación requeridos.',                      version: '1.4', archivo_url: null, estado: 'aprobado' },
    { id: 3,  organizacion_id: 1, codigo: 'PRO-INC-007',  nombre: 'Procedimiento de Gestión de Incidentes',          tipo: 'Procedimiento',obligatorio: true,  descripcion: 'Describe el ciclo completo de detección, respuesta, escalamiento y cierre de incidentes.',    version: '1.2', archivo_url: null, estado: 'revision' },
    { id: 4,  organizacion_id: 1, codigo: 'PRO-CMB-003',  nombre: 'Procedimiento de Gestión de Cambios',             tipo: 'Procedimiento',obligatorio: true,  descripcion: 'Regula el proceso CAB, aprobación y puesta en producción de cambios tecnológicos.',           version: '2.0', archivo_url: null, estado: 'aprobado' },
    { id: 5,  organizacion_id: 1, codigo: 'PLN-CON-001',  nombre: 'Plan de Continuidad de Negocio (BCP)',            tipo: 'Plan',         obligatorio: true,  descripcion: 'Define los procedimientos de recuperación ante interrupciones mayores del negocio.',           version: '0.6', archivo_url: null, estado: 'borrador' },
    { id: 6,  organizacion_id: 1, codigo: 'REG-ACC-012',  nombre: 'Registro de Accesos Privilegiados',               tipo: 'Registro',     obligatorio: true,  descripcion: 'Evidencia de accesos a cuentas privilegiadas con trazabilidad de sesión.',                      version: null,  archivo_url: null, estado: 'aprobado' },
    { id: 7,  organizacion_id: 1, codigo: 'POL-CRP-005',  nombre: 'Política de Criptografía',                        tipo: 'Política',     obligatorio: true,  descripcion: 'Establece los algoritmos y longitudes de clave mínimas permitidas en la organización.',         version: '1.1', archivo_url: null, estado: 'aprobado' },
    { id: 8,  organizacion_id: 1, codigo: 'PRO-PRV-009',  nombre: 'Procedimiento de Tratamiento de Datos Personales',tipo: 'Procedimiento',obligatorio: true,  descripcion: 'Operativiza la Ley 29733 en los procesos de captación, uso y eliminación de datos.',           version: '1.0', archivo_url: null, estado: 'revision' },
    { id: 9,  organizacion_id: 1, codigo: 'INS-BCK-014',  nombre: 'Instructivo de Backups y Restauración',           tipo: 'Instructivo',  obligatorio: true,  descripcion: 'Pasos operativos para respaldo, verificación y restauración de sistemas críticos.',            version: '2.3', archivo_url: null, estado: 'aprobado' },
    { id: 10, organizacion_id: 1, codigo: 'POL-PRV-002',  nombre: 'Política de Privacidad y Datos Personales',       tipo: 'Política',     obligatorio: true,  descripcion: 'Informa a titulares sobre el tratamiento de sus datos según normativa peruana.',               version: '1.2', archivo_url: null, estado: 'aprobado' },
    { id: 11, organizacion_id: 1, codigo: 'REG-RIE-001',  nombre: 'Registro de Riesgos SGSI',                        tipo: 'Registro',     obligatorio: true,  descripcion: 'Inventario actualizado de riesgos identificados, evaluados y en tratamiento.',                  version: null,  archivo_url: null, estado: 'aprobado' },
    { id: 12, organizacion_id: 1, codigo: 'PLN-AUD-2026', nombre: 'Programa Anual de Auditorías 2026',               tipo: 'Plan',         obligatorio: false, descripcion: 'Calendario y alcance de auditorías internas y externas para el ejercicio 2026.',              version: '1.0', archivo_url: null, estado: 'aprobado' },
  ],

  // ── escenario_riesgo ───────────────────────────────────────────────
  // id, organizacion_id, codigo, nombre, descripcion, amenaza, vulnerabilidad, estado
  escenarios_riesgo: [
    { id: 1, organizacion_id: 1, codigo: 'ESC-001', nombre: 'Infraestructura expuesta a ransomware',    descripcion: 'Servidores y endpoints con software desactualizado accesibles desde internet.',                  amenaza: 'Ransomware / Cifrado malicioso',            vulnerabilidad: 'PHP 5.6 sin parches + endpoints sin EDR en segmento operativo',            estado: 'activo' },
    { id: 2, organizacion_id: 1, codigo: 'ESC-002', nombre: 'Fuga de información confidencial',         descripcion: 'Datos de clientes y finanzas expuestos por canales no controlados.',                            amenaza: 'Exfiltración de datos / Ingeniería social', vulnerabilidad: 'DLP no implementado en M365 + ausencia de clasificación en correo',        estado: 'activo' },
    { id: 3, organizacion_id: 1, codigo: 'ESC-003', nombre: 'Acceso no autorizado a sistemas críticos', descripcion: 'Acceso a ERP y TMS por credenciales comprometidas o cuentas con privilegios excesivos.',         amenaza: 'Compromiso de credenciales / Insider',      vulnerabilidad: 'Revisión de accesos sin periodicidad + MFA no aplicado en cuentas svc',    estado: 'activo' },
    { id: 4, organizacion_id: 1, codigo: 'ESC-004', nombre: 'Interrupción de servicios de transporte', descripcion: 'Caída de sistemas TMS o red que impide la operación logística en tiempo real.',                  amenaza: 'Fallo de proveedor / Desastre natural',    vulnerabilidad: 'BCP sin pruebas + enlace MPLS sin redundancia en CD Callao',               estado: 'activo' },
    { id: 5, organizacion_id: 1, codigo: 'ESC-005', nombre: 'Incumplimiento regulatorio de datos',      descripcion: 'Multa o sanción por incumplimiento de la Ley 29733 en tratamiento de datos personales.',         amenaza: 'Regulación / Auditoría externa',           vulnerabilidad: 'Procedimientos de privacidad en revisión + consentimientos no actualizados', estado: 'activo' },
  ],

  // ── riesgo ─────────────────────────────────────────────────────────
  // id, escenario_riesgo_id, codigo, nombre, descripcion,
  // probabilidad_inicial, impacto_inicial, nivel_inicial, tratamiento,
  // probabilidad_actual, impacto_actual, nivel_actual, estado
  riesgos: [
    { id: 1,  escenario_riesgo_id: 1, codigo: 'R-001', nombre: 'Ransomware en TMS productivo',              descripcion: 'El sistema TMS podría ser cifrado por ransomware aprovechando el legacy PHP 5.6 sin parches.',        probabilidad_inicial: 4, impacto_inicial: 5, nivel_inicial: 20, tratamiento: 'mitigar',    probabilidad_actual: 3, impacto_actual: 5, nivel_actual: 15, estado: 'tratamiento' },
    { id: 2,  escenario_riesgo_id: 2, codigo: 'R-002', nombre: 'Fuga de datos de clientes vía e-mail',     descripcion: 'Un empleado podría exfiltrar información confidencial de clientes a través de M365 sin controles DLP.',probabilidad_inicial: 3, impacto_inicial: 4, nivel_inicial: 12, tratamiento: 'mitigar',    probabilidad_actual: 3, impacto_actual: 4, nivel_actual: 12, estado: 'tratamiento' },
    { id: 3,  escenario_riesgo_id: 3, codigo: 'R-003', nombre: 'Acceso no autorizado a SAP B1',            descripcion: 'Credenciales comprometidas podrían permitir acceso al ERP y manipulación de registros financieros.',  probabilidad_inicial: 3, impacto_inicial: 5, nivel_inicial: 15, tratamiento: 'mitigar',    probabilidad_actual: 2, impacto_actual: 5, nivel_actual: 10, estado: 'controlado'  },
    { id: 4,  escenario_riesgo_id: 4, codigo: 'R-004', nombre: 'Caída del enlace MPLS Callao',             descripcion: 'Interrupción del enlace principal deja sin conectividad al CD Callao afectando operaciones.',          probabilidad_inicial: 3, impacto_inicial: 3, nivel_inicial: 9,  tratamiento: 'transferir', probabilidad_actual: 3, impacto_actual: 3, nivel_actual: 9,  estado: 'controlado'  },
    { id: 5,  escenario_riesgo_id: 2, codigo: 'R-005', nombre: 'Phishing dirigido a Finanzas',             descripcion: 'Correo de phishing podría comprometer credenciales del equipo financiero facilitando fraude.',         probabilidad_inicial: 4, impacto_inicial: 4, nivel_inicial: 16, tratamiento: 'mitigar',    probabilidad_actual: 4, impacto_actual: 4, nivel_actual: 16, estado: 'tratamiento' },
    { id: 6,  escenario_riesgo_id: 3, codigo: 'R-006', nombre: 'Pérdida de laptop de gerente comercial',  descripcion: 'Equipo no cifrado podría exponer información comercial sensible ante robo o extravío.',                probabilidad_inicial: 3, impacto_inicial: 3, nivel_inicial: 9,  tratamiento: 'mitigar',    probabilidad_actual: 2, impacto_actual: 3, nivel_actual: 6,  estado: 'controlado'  },
    { id: 7,  escenario_riesgo_id: 5, codigo: 'R-007', nombre: 'Incumplimiento Ley 29733',                 descripcion: 'Tratamiento de datos personales sin las medidas requeridas por la normativa peruana vigente.',         probabilidad_inicial: 2, impacto_inicial: 5, nivel_inicial: 10, tratamiento: 'mitigar',    probabilidad_actual: 2, impacto_actual: 5, nivel_actual: 10, estado: 'tratamiento' },
    { id: 8,  escenario_riesgo_id: 4, codigo: 'R-008', nombre: 'Fallo del proveedor cloud (Azure)',        descripcion: 'Indisponibilidad de Azure East US 2 afectaría TMS, BD clientes y M365 simultáneamente.',              probabilidad_inicial: 2, impacto_inicial: 4, nivel_inicial: 8,  tratamiento: 'aceptar',    probabilidad_actual: 2, impacto_actual: 4, nivel_actual: 8,  estado: 'aceptado'    },
    { id: 9,  escenario_riesgo_id: 3, codigo: 'R-009', nombre: 'Sabotaje interno a sistema de flota',     descripcion: 'Un insider podría alterar rutas o datos del TMS causando pérdidas operativas graves.',                  probabilidad_inicial: 2, impacto_inicial: 5, nivel_inicial: 10, tratamiento: 'mitigar',    probabilidad_actual: 1, impacto_actual: 5, nivel_actual: 5,  estado: 'controlado'  },
    { id: 10, escenario_riesgo_id: 4, codigo: 'R-010', nombre: 'Robo físico en CD Lurín',                  descripcion: 'Sustracción de hardware o documentos físicos del centro de distribución sur.',                        probabilidad_inicial: 2, impacto_inicial: 3, nivel_inicial: 6,  tratamiento: 'mitigar',    probabilidad_actual: 2, impacto_actual: 3, nivel_actual: 6,  estado: 'controlado'  },
    { id: 11, escenario_riesgo_id: 1, codigo: 'R-011', nombre: 'Vulnerabilidad legacy PHP 5.6',            descripcion: 'El módulo web de flota en PHP 5.6 presenta vulnerabilidades críticas explotables remotamente.',       probabilidad_inicial: 5, impacto_inicial: 4, nivel_inicial: 20, tratamiento: 'mitigar',    probabilidad_actual: 5, impacto_actual: 4, nivel_actual: 20, estado: 'tratamiento' },
    { id: 12, escenario_riesgo_id: 4, codigo: 'R-012', nombre: 'Backup no restaurable',                    descripcion: 'Los respaldos no han sido probados y podrían fallar en un escenario de recuperación real.',            probabilidad_inicial: 3, impacto_inicial: 5, nivel_inicial: 15, tratamiento: 'mitigar',    probabilidad_actual: 2, impacto_actual: 5, nivel_actual: 10, estado: 'controlado'  },
  ],

  // ── auditoria ──────────────────────────────────────────────────────
  // id, organizacion_id, codigo, nombre, tipo, alcance,
  // fecha_inicio, fecha_fin, fecha_vencimiento, estado
  auditorias: [
    { id: 1, organizacion_id: 1, codigo: 'AU-2026-01', nombre: 'Auditoría interna Q1 — Controles de acceso',    tipo: 'Interna',  alcance: 'A.5.15, A.8.2, A.8.3',        fecha_inicio: '2026-02-10', fecha_fin: '2026-02-24', fecha_vencimiento: '2026-03-10', estado: 'completada' },
    { id: 2, organizacion_id: 1, codigo: 'AU-2026-02', nombre: 'Auditoría interna Q2 — Gestión de incidentes', tipo: 'Interna',  alcance: 'A.5.24-A.5.28',               fecha_inicio: '2026-04-15', fecha_fin: '2026-05-02', fecha_vencimiento: '2026-05-30', estado: 'en-curso'   },
    { id: 3, organizacion_id: 1, codigo: 'AU-2026-03', nombre: 'Auditoría externa de certificación',           tipo: 'Externa',  alcance: 'SGSI completo — 93 controles', fecha_inicio: '2026-09-15', fecha_fin: '2026-09-26', fecha_vencimiento: '2026-10-10', estado: 'planificada'},
    { id: 4, organizacion_id: 1, codigo: 'AU-2026-04', nombre: 'Auditoría a proveedor — DataCenter Lima',      tipo: 'Tercero',  alcance: 'A.5.19-A.5.23',               fecha_inicio: '2026-06-03', fecha_fin: '2026-06-07', fecha_vencimiento: '2026-06-21', estado: 'planificada'},
    { id: 5, organizacion_id: 1, codigo: 'AU-2025-04', nombre: 'Auditoría interna Q4 2025 — Continuidad',      tipo: 'Interna',  alcance: 'A.5.29, A.5.30, A.8.13',      fecha_inicio: '2025-11-04', fecha_fin: '2025-11-18', fecha_vencimiento: '2025-12-05', estado: 'completada' },
  ],

  // ── auditoria_hallazgo ─────────────────────────────────────────────
  // id, auditoria_id, codigo, titulo, descripcion, severidad, estado
  auditoria_hallazgos: [
    { id: 1,  auditoria_id: 1, codigo: 'HAL-001', titulo: 'Cuentas privilegiadas sin revisión',          descripcion: 'Se identificaron 14 cuentas con privilegios de administrador que no han sido revisadas en los últimos 90 días.',    severidad: 'mayor', estado: 'abierto'  },
    { id: 2,  auditoria_id: 1, codigo: 'HAL-002', titulo: 'Retención de logs insuficiente',              descripcion: 'El proyecto piloto de Sentinel tiene retención configurada en 30 días, por debajo del mínimo de 12 meses.',        severidad: 'menor', estado: 'abierto'  },
    { id: 3,  auditoria_id: 1, codigo: 'HAL-003', titulo: 'Backups no cifrados (legacy)',                descripcion: 'Backups anteriores a Mar-2026 no están cifrados conforme a la Política de Criptografía.',                          severidad: 'menor', estado: 'abierto'  },
    { id: 4,  auditoria_id: 1, codigo: 'HAL-004', titulo: 'Sin proceso de reconciliación de accesos',   descripcion: 'No existe evidencia de revisión trimestral de accesos al ERP por parte del área de Finanzas.',                    severidad: 'mayor', estado: 'cerrado'  },
    { id: 5,  auditoria_id: 1, codigo: 'HAL-005', titulo: 'MFA pendiente en cuentas de servicio',       descripcion: '4 cuentas de servicio no tienen MFA habilitado, incumpliendo la Política de Control de Acceso.',                  severidad: 'mayor', estado: 'abierto'  },
    { id: 6,  auditoria_id: 2, codigo: 'HAL-006', titulo: 'Procedimiento de incidentes no probado',     descripcion: 'El PRO-INC-007 no ha sido ejecutado en un simulacro en los últimos 12 meses.',                                    severidad: 'mayor', estado: 'abierto'  },
    { id: 7,  auditoria_id: 2, codigo: 'HAL-007', titulo: 'Checklist de baja de personal incompleto',   descripcion: 'En 6 de 10 bajas revisadas no se encontró el checklist de desvinculación firmado.',                              severidad: 'menor', estado: 'abierto'  },
    { id: 8,  auditoria_id: 2, codigo: 'HAL-008', titulo: 'Clasificación de incidentes inconsistente',  descripcion: 'Los criterios de severidad no se aplican uniformemente en todos los equipos que reportan incidentes.',             severidad: 'menor', estado: 'abierto'  },
    { id: 9,  auditoria_id: 5, codigo: 'HAL-009', titulo: 'BCP sin prueba en 2025',                     descripcion: 'No se realizó ningún ejercicio de continuidad durante 2025, incumpliendo el Plan Anual de Auditorías.',            severidad: 'mayor', estado: 'cerrado'  },
    { id: 10, auditoria_id: 5, codigo: 'HAL-010', titulo: 'Inventario de activos desactualizado',       descripcion: 'El inventario del CD Sur presenta 15 activos no actualizados con fecha de revisión mayor a 6 meses.',             severidad: 'menor', estado: 'cerrado'  },
    { id: 11, auditoria_id: 5, codigo: 'HAL-011', titulo: 'Capacitación phishing incompleta',           descripcion: 'El 13% de colaboradores no completó el módulo de phishing del Plan de Concienciación 2025.',                     severidad: 'menor', estado: 'cerrado'  },
    { id: 12, auditoria_id: 5, codigo: 'HAL-012', titulo: 'Servidor legacy sin parche crítico',         descripcion: 'Un servidor de la red operativa presenta una vulnerabilidad crítica CVE sin aplicar desde hace 180 días.',         severidad: 'critica', estado: 'abierto' },
  ],

  // ── no_conformidades ───────────────────────────────────────────────
  // id, auditoria_id, codigo, titulo, descripcion, causa_raiz,
  // accion_correctiva, severidad, fecha_identificacion,
  // fecha_vencimiento, fecha_cierre, estado
  noConformidades: [
    { id: 1,  auditoria_id: 1, codigo: 'NC-001', titulo: 'Cuentas privilegiadas sin revisión trimestral',           descripcion: '14 cuentas admin sin revisión en 90+ días.',                                           causa_raiz: 'Proceso de revisión de accesos no calendarizado ni asignado a un responsable.',                    accion_correctiva: 'Implementar revisión trimestral automatizada con reporte a CISO.',                            severidad: 'mayor',  fecha_identificacion: '2026-02-20', fecha_vencimiento: '2026-05-15', fecha_cierre: null,         estado: 'identificada' },
    { id: 2,  auditoria_id: 1, codigo: 'NC-002', titulo: 'Logs de Sentinel con retención < 12 meses',               descripcion: 'Retención en proyecto piloto configurada en 30 días.',                                  causa_raiz: 'Configuración por defecto no modificada al habilitar el workspace piloto.',                        accion_correctiva: 'Ajustar retención a 12 meses y validar política de archivado.',                              severidad: 'menor',  fecha_identificacion: '2026-02-20', fecha_vencimiento: '2026-05-22', fecha_cierre: null,         estado: 'analisis'     },
    { id: 3,  auditoria_id: 1, codigo: 'NC-003', titulo: 'Backups legacy sin cifrado',                               descripcion: 'Backups previos a Mar-2026 no cifrados.',                                               causa_raiz: 'Política de criptografía aprobada en Feb-2026 no fue aplicada retroactivamente.',                  accion_correctiva: 'Re-cifrar backups históricos y actualizar el instructivo de respaldo.',                      severidad: 'menor',  fecha_identificacion: '2026-02-20', fecha_vencimiento: '2026-06-01', fecha_cierre: null,         estado: 'analisis'     },
    { id: 4,  auditoria_id: 5, codigo: 'NC-004', titulo: 'BCP no probado en 2025',                                   descripcion: 'No se ejecutó ningún simulacro de continuidad en 2025.',                                causa_raiz: 'Falta de planificación y asignación presupuestal para ejercicios de continuidad.',                  accion_correctiva: 'Programar y ejecutar simulacro de continuidad antes de Q3-2026.',                            severidad: 'mayor',  fecha_identificacion: '2025-11-15', fecha_vencimiento: '2026-07-30', fecha_cierre: null,         estado: 'plan'         },
    { id: 5,  auditoria_id: 5, codigo: 'NC-005', titulo: 'Inventario de activos desactualizado — CD Sur',            descripcion: '15 activos sin revisión en > 6 meses.',                                                 causa_raiz: 'Responsable de activos en CD Sur no tenía acceso a la herramienta de inventario.',                 accion_correctiva: 'Designar responsable local y ejecutar revisión completa del inventario.',                    severidad: 'menor',  fecha_identificacion: '2025-11-15', fecha_vencimiento: '2026-05-10', fecha_cierre: null,         estado: 'plan'         },
    { id: 6,  auditoria_id: 2, codigo: 'NC-006', titulo: 'Baja de personal sin checklist firmado',                   descripcion: '6 de 10 bajas sin checklist de desvinculación.',                                        causa_raiz: 'El proceso de offboarding no estaba formalizado en RR.HH.',                                        accion_correctiva: 'Formalizar checklist en HRIS y capacitar a gestores.',                                       severidad: 'menor',  fecha_identificacion: '2026-04-20', fecha_vencimiento: '2026-06-15', fecha_cierre: null,         estado: 'identificada' },
    { id: 7,  auditoria_id: 2, codigo: 'NC-007', titulo: 'MFA no aplicado a cuentas de servicio',                   descripcion: '4 cuentas de servicio sin MFA.',                                                        causa_raiz: 'Las cuentas de servicio fueron excluidas erróneamente de la política de MFA.',                      accion_correctiva: 'Aplicar MFA o justificar excepción documentada para cada cuenta de servicio.',               severidad: 'mayor',  fecha_identificacion: '2026-04-20', fecha_vencimiento: '2026-05-08', fecha_cierre: null,         estado: 'ejecucion'    },
    { id: 8,  auditoria_id: 5, codigo: 'NC-008', titulo: 'Capacitación phishing incompleta',                         descripcion: '12 colaboradores sin completar módulo de phishing 2025.',                               causa_raiz: 'La plataforma LMS no envió recordatorios automáticos a usuarios con módulo pendiente.',             accion_correctiva: 'Completar capacitación pendiente y activar recordatorios automáticos en LMS.',               severidad: 'menor',  fecha_identificacion: '2025-11-15', fecha_vencimiento: '2026-05-20', fecha_cierre: null,         estado: 'ejecucion'    },
    { id: 9,  auditoria_id: 5, codigo: 'NC-009', titulo: 'NDA sin firmar — proveedor de servicios cloud',            descripcion: 'Contrato de confidencialidad del proveedor X sin firma.',                               causa_raiz: 'El proceso de onboarding de proveedores no validaba la firma de NDA.',                              accion_correctiva: 'Firmar NDA y actualizar el procedimiento de onboarding de proveedores.',                     severidad: 'menor',  fecha_identificacion: '2025-11-15', fecha_vencimiento: '2026-03-10', fecha_cierre: '2026-03-08',  estado: 'cerrada'      },
    { id: 10, auditoria_id: 5, codigo: 'NC-010', titulo: 'Servidor legacy sin parche crítico',                       descripcion: 'Vulnerabilidad crítica CVE sin parche en servidor operativo.',                           causa_raiz: 'El servidor fue excluido del ciclo de parcheo por incompatibilidad de aplicativo legacy.',          accion_correctiva: 'Aplicar parche o aislar servidor en VLAN restringida hasta migración.',                      severidad: 'critica',fecha_identificacion: '2025-11-15', fecha_vencimiento: '2026-05-05', fecha_cierre: null,         estado: 'ejecucion'    },
    { id: 11, auditoria_id: 1, codigo: 'NC-011', titulo: 'Capacitación phishing pendiente — VP Comercial',           descripcion: 'El VP Comercial no completó el módulo de phishing.',                                    causa_raiz: 'Agenda directiva no permitió completar el módulo en el plazo establecido.',                        accion_correctiva: 'Completar módulo de forma asincrónica en plataforma LMS.',                                   severidad: 'menor',  fecha_identificacion: '2026-02-20', fecha_vencimiento: '2026-04-15', fecha_cierre: '2026-04-12',  estado: 'cerrada'      },
  ],

  // ── usuario ────────────────────────────────────────────────────────
  // id, organizacion_id, nombre, correo, funcion, rol, area,
  // mfa_activo, ultimo_acceso_at, estado
  usuarios: [
    { id: 1,  organizacion_id: 1, nombre: 'Andrea Vargas',   correo: 'andrea.vargas@loginorte.com.pe',   funcion: 'Oficial de Seguridad de la Información', rol: 'Oficial de SI',           area: 'Seguridad',  mfa_activo: true,  ultimo_acceso_at: '2026-05-14 09:30:00', estado: 'activo'    },
    { id: 2,  organizacion_id: 1, nombre: 'Luis Mendoza',    correo: 'luis.mendoza@loginorte.com.pe',    funcion: 'Jefe de Infraestructura TI',             rol: 'Administrador SGSI',      area: 'TI',         mfa_activo: true,  ultimo_acceso_at: '2026-05-14 09:12:00', estado: 'activo'    },
    { id: 3,  organizacion_id: 1, nombre: 'Carla Ríos',      correo: 'carla.rios@loginorte.com.pe',      funcion: 'Auditora Interna de SI',                 rol: 'Auditor interno',         area: 'Auditoría',  mfa_activo: true,  ultimo_acceso_at: '2026-05-14 08:20:00', estado: 'activo'    },
    { id: 4,  organizacion_id: 1, nombre: 'José Quispe',     correo: 'jose.quispe@loginorte.com.pe',     funcion: 'Técnico de Operaciones TI',              rol: 'Operador TI',             area: 'TI',         mfa_activo: true,  ultimo_acceso_at: '2026-05-14 06:45:00', estado: 'activo'    },
    { id: 5,  organizacion_id: 1, nombre: 'María Soto',      correo: 'maria.soto@loginorte.com.pe',      funcion: 'Jefa de Atención al Cliente',            rol: 'Responsable de proceso',  area: 'Operaciones',mfa_activo: false, ultimo_acceso_at: '2026-05-13 17:10:00', estado: 'activo'    },
    { id: 6,  organizacion_id: 1, nombre: 'Pedro Salazar',   correo: 'pedro.salazar@loginorte.com.pe',   funcion: 'Gerente General',                        rol: 'Lector',                  area: 'Gerencia',   mfa_activo: true,  ultimo_acceso_at: '2026-05-10 11:00:00', estado: 'activo'    },
    { id: 7,  organizacion_id: 1, nombre: 'Lucía Fernández', correo: 'lucia.fernandez@loginorte.com.pe', funcion: 'Analista de Recursos Humanos',           rol: 'Responsable de proceso',  area: 'RR.HH.',     mfa_activo: true,  ultimo_acceso_at: '2026-05-14 07:55:00', estado: 'activo'    },
    { id: 8,  organizacion_id: 1, nombre: 'Diego Castillo',  correo: 'diego.castillo@loginorte.com.pe',  funcion: 'Asesor Legal Externo',                   rol: 'Lector',                  area: 'Legal',      mfa_activo: false, ultimo_acceso_at: null,                  estado: 'invitado'  },
    { id: 9,  organizacion_id: 1, nombre: 'Rosa Huamán',     correo: 'rosa.huaman@loginorte.com.pe',     funcion: 'Contadora Senior',                       rol: 'Responsable de proceso',  area: 'Finanzas',   mfa_activo: true,  ultimo_acceso_at: '2026-05-14 09:00:00', estado: 'activo'    },
    { id: 10, organizacion_id: 1, nombre: 'Carlos Rojas',    correo: 'carlos.rojas@loginorte.com.pe',    funcion: 'Analista de Soporte TI',                 rol: 'Operador TI',             area: 'TI',         mfa_activo: true,  ultimo_acceso_at: '2026-04-22 14:20:00', estado: 'suspendido'},
  ],

  // ── actividad_riesgo ───────────────────────────────────────────────
  // SQL: id, riesgo_id, codigo, descripcion, tipo_actividad, fecha_inicio,
  //      fecha_vencimiento, fecha_cierre, probabilidad_resultante,
  //      impacto_resultante, nivel_resultante, resultado, evidencia_url, estado.
  // Aliases legacy: fecha (=fecha_inicio), tipo (=tipo_actividad),
  // responsable (no en SQL — se conserva como información operativa local).
  actividad_riesgo: [
    { id: 1,  riesgo_id: 1,  codigo: 'ACT-001', tipo_actividad: 'Identificación', fecha_inicio: '2026-02-18', fecha_vencimiento: '2026-02-25', fecha_cierre: '2026-02-18', probabilidad_resultante: 4, impacto_resultante: 5, nivel_resultante: 20, descripcion: 'Riesgo identificado durante análisis de vulnerabilidades del TMS (PHP 5.6 sin parches).',           resultado: 'Riesgo registrado con valoración inicial crítica.',                         evidencia_url: '',                                  estado: 'completada', responsable: 'Luis Mendoza',  get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 2,  riesgo_id: 1,  codigo: 'ACT-002', tipo_actividad: 'Evaluación',     fecha_inicio: '2026-03-05', fecha_vencimiento: '2026-03-12', fecha_cierre: '2026-03-05', probabilidad_resultante: 4, impacto_resultante: 5, nivel_resultante: 20, descripcion: 'Nivel inicial calculado: P=4, I=5 → Crítico (20). Tratamiento asignado: mitigar.',               resultado: 'Tratamiento definido como mitigar.',                                       evidencia_url: '',                                  estado: 'completada', responsable: 'Andrea Vargas', get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 3,  riesgo_id: 1,  codigo: 'ACT-003', tipo_actividad: 'Tratamiento',    fecha_inicio: '2026-03-20', fecha_vencimiento: '2026-04-15', fecha_cierre: '2026-04-10', probabilidad_resultante: 3, impacto_resultante: 5, nivel_resultante: 15, descripcion: 'EDR desplegado en todos los servidores TMS. Nivel residual ajustado a 15.',                      resultado: 'Reducción de nivel actual de 20 → 15.',                                    evidencia_url: 'doc://EDR-TMS-deploy.pdf',          estado: 'completada', responsable: 'Luis Mendoza',  get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 4,  riesgo_id: 1,  codigo: 'ACT-004', tipo_actividad: 'Seguimiento',    fecha_inicio: '2026-04-28', fecha_vencimiento: '2026-06-30', fecha_cierre: '2026-04-28', probabilidad_resultante: 3, impacto_resultante: 5, nivel_resultante: 15, descripcion: 'Plan de migración PHP 8.2 aprobado por Gerencia. Inicio Q2 2026.',                                resultado: 'Plan aprobado; pendiente ejecución.',                                      evidencia_url: '',                                  estado: 'en_curso',   responsable: 'Andrea Vargas', get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 5,  riesgo_id: 2,  codigo: 'ACT-005', tipo_actividad: 'Identificación', fecha_inicio: '2026-02-20', fecha_vencimiento: '2026-02-27', fecha_cierre: '2026-02-20', probabilidad_resultante: 3, impacto_resultante: 4, nivel_resultante: 12, descripcion: 'Detectado en revisión de controles DLP — M365 sin políticas de retención configuradas.',        resultado: 'Riesgo registrado.',                                                       evidencia_url: '',                                  estado: 'completada', responsable: 'Carla Ríos',    get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 6,  riesgo_id: 2,  codigo: 'ACT-006', tipo_actividad: 'Tratamiento',    fecha_inicio: '2026-04-10', fecha_vencimiento: '2026-09-30', fecha_cierre: '2026-04-10', probabilidad_resultante: 3, impacto_resultante: 4, nivel_resultante: 12, descripcion: 'Piloto Microsoft Purview iniciado. Cobertura estimada Q3 2026.',                                 resultado: 'Piloto en marcha.',                                                        evidencia_url: 'doc://Purview-Pilot-Q2.pdf',        estado: 'en_curso',   responsable: 'Luis Mendoza',  get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 7,  riesgo_id: 3,  codigo: 'ACT-007', tipo_actividad: 'Identificación', fecha_inicio: '2026-02-15', fecha_vencimiento: '2026-02-22', fecha_cierre: '2026-02-15', probabilidad_resultante: 3, impacto_resultante: 5, nivel_resultante: 15, descripcion: 'Revisión de accesos detectó cuentas SAP con privilegios excesivos sin revisión desde 2024.',    resultado: 'Riesgo de accesos elevados registrado.',                                   evidencia_url: '',                                  estado: 'completada', responsable: 'Andrea Vargas', get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 8,  riesgo_id: 3,  codigo: 'ACT-008', tipo_actividad: 'Tratamiento',    fecha_inicio: '2026-04-01', fecha_vencimiento: '2026-04-20', fecha_cierre: '2026-04-18', probabilidad_resultante: 2, impacto_resultante: 5, nivel_resultante: 10, descripcion: 'MFA habilitado en cuentas SAP B1. Revisión de roles completada. Nivel residual → 10.',           resultado: 'Nivel residual reducido a 10.',                                            evidencia_url: 'doc://MFA-SAP-rollout.pdf',         estado: 'completada', responsable: 'Luis Mendoza',  get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 9,  riesgo_id: 5,  codigo: 'ACT-009', tipo_actividad: 'Identificación', fecha_inicio: '2026-03-10', fecha_vencimiento: '2026-03-17', fecha_cierre: '2026-03-10', probabilidad_resultante: 4, impacto_resultante: 4, nivel_resultante: 16, descripcion: 'Phishing simulado reveló tasa de 23% de click en Finanzas (objetivo <10%).',                    resultado: 'Línea base de exposición humana confirmada.',                              evidencia_url: '',                                  estado: 'completada', responsable: 'Andrea Vargas', get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 10, riesgo_id: 5,  codigo: 'ACT-010', tipo_actividad: 'Capacitación',   fecha_inicio: '2026-04-15', fecha_vencimiento: '2026-05-30', fecha_cierre: '2026-04-30', probabilidad_resultante: 4, impacto_resultante: 4, nivel_resultante: 16, descripcion: 'Capacitación anti-phishing completada en 87% del equipo de Finanzas.',                          resultado: 'Cobertura 87%; pendiente cierre del último grupo.',                        evidencia_url: 'doc://LMS-Phish-Fin-Q1.pdf',         estado: 'en_curso',   responsable: 'Rosa Huamán',   get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 11, riesgo_id: 11, codigo: 'ACT-011', tipo_actividad: 'Identificación', fecha_inicio: '2026-02-20', fecha_vencimiento: '2026-02-27', fecha_cierre: '2026-02-20', probabilidad_resultante: 5, impacto_resultante: 4, nivel_resultante: 20, descripcion: 'CVE crítico identificado en módulo web PHP 5.6 del TMS (acceso remoto sin autenticación).',     resultado: 'CVE crítico registrado.',                                                  evidencia_url: '',                                  estado: 'completada', responsable: 'Luis Mendoza',  get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 12, riesgo_id: 11, codigo: 'ACT-012', tipo_actividad: 'Tratamiento',    fecha_inicio: '2026-03-15', fecha_vencimiento: '2026-06-30', fecha_cierre: '2026-03-25', probabilidad_resultante: 5, impacto_resultante: 4, nivel_resultante: 20, descripcion: 'Servidor aislado en VLAN restringida temporalmente. Plan de migración aprobado Q2 2026.',        resultado: 'Aislamiento aplicado; migración en plan.',                                 evidencia_url: 'doc://VLAN-Iso-PHP.pdf',            estado: 'en_curso',   responsable: 'Luis Mendoza',  get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 13, riesgo_id: 12, codigo: 'ACT-013', tipo_actividad: 'Identificación', fecha_inicio: '2026-03-01', fecha_vencimiento: '2026-03-08', fecha_cierre: '2026-03-01', probabilidad_resultante: 3, impacto_resultante: 5, nivel_resultante: 15, descripcion: 'Prueba de restauración de backup falló en entorno de QA. Backups no validados desde 2025.',    resultado: 'Falla de restauración confirmada.',                                        evidencia_url: 'doc://QA-Restore-Fail.pdf',         estado: 'completada', responsable: 'José Quispe',   get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
    { id: 14, riesgo_id: 12, codigo: 'ACT-014', tipo_actividad: 'Tratamiento',    fecha_inicio: '2026-04-10', fecha_vencimiento: '2026-05-30', fecha_cierre: '2026-04-10', probabilidad_resultante: 2, impacto_resultante: 5, nivel_resultante: 10, descripcion: 'Instructivo de backups actualizado. Prueba de restauración programada para mayo 2026.',         resultado: 'Instructivo emitido; prueba pendiente.',                                   evidencia_url: '',                                  estado: 'en_curso',   responsable: 'Luis Mendoza',  get fecha() { return this.fecha_inicio; }, get tipo() { return this.tipo_actividad; } },
  ],

  // ── riesgo_control (M:N) ───────────────────────────────────────────
  // SQL: control_soa_id, riesgo_id, tipo_relacion, efectividad_estimada, observaciones.
  // Aliases legacy: control_id (=codigo del control), estado (=efectividad_estimada),
  // observacion (=observaciones) — para no romper la UI actual.
  riesgo_control: [
    { control_soa_id:  7, riesgo_id: 1,  control_id: 'A.5.30', tipo_relacion: 'preventivo',  efectividad_estimada: 'planificado',  observaciones: 'BCP en redacción, pruebas programadas Q3 2026',                  get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 16, riesgo_id: 1,  control_id: 'A.8.7',  tipo_relacion: 'preventivo',  efectividad_estimada: 'implementado', observaciones: 'Microsoft Defender for Endpoint en todos los servidores TMS',     get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 17, riesgo_id: 1,  control_id: 'A.8.8',  tipo_relacion: 'preventivo',  efectividad_estimada: 'parcial',      observaciones: 'Gestión de vulnerabilidades pendiente en servidor PHP 5.6',      get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 19, riesgo_id: 2,  control_id: 'A.8.12', tipo_relacion: 'preventivo',  efectividad_estimada: 'planificado',  observaciones: 'Piloto Microsoft Purview en Q2 2026',                            get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id:  5, riesgo_id: 2,  control_id: 'A.5.15', tipo_relacion: 'preventivo',  efectividad_estimada: 'implementado', observaciones: 'Política RBAC con revisión trimestral',                          get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id:  5, riesgo_id: 3,  control_id: 'A.5.15', tipo_relacion: 'preventivo',  efectividad_estimada: 'implementado', observaciones: 'MFA obligatorio en Azure AD',                                    get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 15, riesgo_id: 3,  control_id: 'A.8.5',  tipo_relacion: 'preventivo',  efectividad_estimada: 'implementado', observaciones: 'Autenticación segura habilitada en SAP B1',                      get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id:  7, riesgo_id: 4,  control_id: 'A.5.30', tipo_relacion: 'recuperativo', efectividad_estimada: 'planificado',  observaciones: 'BCP pendiente de prueba en CD Callao',                           get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id:  9, riesgo_id: 5,  control_id: 'A.6.3',  tipo_relacion: 'preventivo',  efectividad_estimada: 'implementado', observaciones: 'Plan de concienciación anual + phishing simulado mensual',       get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 23, riesgo_id: 5,  control_id: 'A.8.23', tipo_relacion: 'preventivo',  efectividad_estimada: 'implementado', observaciones: 'Cisco Umbrella filtrando URLs maliciosas',                       get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id:  5, riesgo_id: 7,  control_id: 'A.5.15', tipo_relacion: 'preventivo',  efectividad_estimada: 'planificado',  observaciones: 'Actualización de cláusulas de consentimiento en proceso',        get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 17, riesgo_id: 11, control_id: 'A.8.8',  tipo_relacion: 'preventivo',  efectividad_estimada: 'parcial',      observaciones: 'CVE pendiente de parche — servidor en VLAN restringida',         get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 18, riesgo_id: 11, control_id: 'A.8.9',  tipo_relacion: 'preventivo',  efectividad_estimada: 'parcial',      observaciones: 'Baseline CIS no aplicado al segmento legacy',                    get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
    { control_soa_id: 20, riesgo_id: 12, control_id: 'A.8.13', tipo_relacion: 'recuperativo', efectividad_estimada: 'parcial',     observaciones: 'Backups configurados pero restauración no probada',              get estado() { return this.efectividad_estimada; }, get observacion() { return this.observaciones; } },
  ],

  // ── aprobacion ─────────────────────────────────────────────────────
  // SQL: id, organizacion_id, codigo, tipo_entidad (alcance|objetivo|documento),
  // entidad_id, comentario, fecha_solicitud, fecha_respuesta, fecha_vencimiento, estado
  aprobaciones: [
    { id: 1,  organizacion_id: 1, codigo: 'APR-001', tipo_entidad: 'alcance',   entidad_id: 1,  comentario: 'Solicitud de aprobación del alcance del SGSI v1.0 por la Alta Dirección.',       fecha_solicitud: '2026-03-01', fecha_respuesta: '2026-03-08', fecha_vencimiento: '2026-03-15', estado: 'aprobado'  },
    { id: 2,  organizacion_id: 1, codigo: 'APR-002', tipo_entidad: 'objetivo',  entidad_id: 1,  comentario: 'Aprobación del objetivo de reducción de riesgo residual.',                       fecha_solicitud: '2026-03-05', fecha_respuesta: '2026-03-09', fecha_vencimiento: '2026-03-20', estado: 'aprobado'  },
    { id: 3,  organizacion_id: 1, codigo: 'APR-003', tipo_entidad: 'objetivo',  entidad_id: 2,  comentario: 'Aprobación del objetivo de certificación ISO 27001:2022.',                       fecha_solicitud: '2026-03-05', fecha_respuesta: '2026-03-09', fecha_vencimiento: '2026-03-20', estado: 'aprobado'  },
    { id: 4,  organizacion_id: 1, codigo: 'APR-004', tipo_entidad: 'objetivo',  entidad_id: 3,  comentario: 'Pendiente aprobación: meta de reducción de phishing.',                            fecha_solicitud: '2026-04-15', fecha_respuesta: null,         fecha_vencimiento: '2026-05-20', estado: 'pendiente' },
    { id: 5,  organizacion_id: 1, codigo: 'APR-005', tipo_entidad: 'objetivo',  entidad_id: 4,  comentario: 'Pendiente aprobación: objetivo BCP.',                                              fecha_solicitud: '2026-04-15', fecha_respuesta: null,         fecha_vencimiento: '2026-05-20', estado: 'pendiente' },
    { id: 6,  organizacion_id: 1, codigo: 'APR-006', tipo_entidad: 'documento', entidad_id: 1,  comentario: 'Aprobación de la Política de Seguridad de la Información v2.1.',                  fecha_solicitud: '2026-03-10', fecha_respuesta: '2026-03-12', fecha_vencimiento: '2026-03-20', estado: 'aprobado'  },
    { id: 7,  organizacion_id: 1, codigo: 'APR-007', tipo_entidad: 'documento', entidad_id: 2,  comentario: 'Aprobación de la Política de Control de Acceso v1.4.',                            fecha_solicitud: '2026-03-15', fecha_respuesta: '2026-03-22', fecha_vencimiento: '2026-04-01', estado: 'aprobado'  },
    { id: 8,  organizacion_id: 1, codigo: 'APR-008', tipo_entidad: 'documento', entidad_id: 3,  comentario: 'Procedimiento de Gestión de Incidentes — en revisión por Gerencia.',              fecha_solicitud: '2026-04-20', fecha_respuesta: null,         fecha_vencimiento: '2026-05-15', estado: 'pendiente' },
    { id: 9,  organizacion_id: 1, codigo: 'APR-009', tipo_entidad: 'documento', entidad_id: 5,  comentario: 'Plan de Continuidad de Negocio v0.6 — pendiente revisión inicial.',                fecha_solicitud: '2026-04-22', fecha_respuesta: null,         fecha_vencimiento: '2026-06-01', estado: 'pendiente' },
    { id: 10, organizacion_id: 1, codigo: 'APR-010', tipo_entidad: 'documento', entidad_id: 8,  comentario: 'Procedimiento de Tratamiento de Datos Personales — observado, devuelto a Legal.', fecha_solicitud: '2026-04-10', fecha_respuesta: '2026-04-14', fecha_vencimiento: '2026-04-30', estado: 'rechazado' },
    { id: 11, organizacion_id: 1, codigo: 'APR-011', tipo_entidad: 'objetivo',  entidad_id: 6,  comentario: 'Aprobación del objetivo de cerrar NC mayores antes de auditoría externa.',         fecha_solicitud: '2026-04-25', fecha_respuesta: null,         fecha_vencimiento: '2026-05-30', estado: 'pendiente' },
  ],

  // ── objetivo_sgsi ──────────────────────────────────────────────────
  // SQL: id, organizacion_id, codigo, nombre, descripcion, indicador, meta, estado
  // Campos legacy (valor_actual/responsable/fecha_inicio/fecha_fin) se mantienen
  // como aliases para no romper la UI; serán retirados al migrar las pantallas.
  objetivos_sgsi: [
    { id: 1, organizacion_id: 1, codigo: 'OBJ-001', nombre: 'Reducir nivel de riesgo residual promedio a ≤7', descripcion: 'Bajar el nivel de riesgo residual promedio del registro SGSI al cierre del año.',                  indicador: 'Nivel residual promedio (escala 1-25)', meta: '≤7',    estado: 'en_curso', valor_actual: '9.2', responsable: 'Andrea Vargas', fecha_inicio: '2026-01-15', fecha_fin: '2026-12-31' },
    { id: 2, organizacion_id: 1, codigo: 'OBJ-002', nombre: 'Obtener certificación ISO 27001:2022',           descripcion: 'Cerrar el ciclo de implementación y aprobar la auditoría externa de certificación inicial.',    indicador: '% controles Anexo A implementados',     meta: '≥90%',  estado: 'en_curso', valor_actual: '73%', responsable: 'Andrea Vargas', fecha_inicio: '2026-01-15', fecha_fin: '2026-12-15' },
    { id: 3, organizacion_id: 1, codigo: 'OBJ-003', nombre: 'Reducir tasa de phishing simulado',              descripcion: 'Disminuir el clic en correos de phishing simulados mediante capacitación recurrente.',         indicador: '% colaboradores que hacen click en phishing', meta: '<10%', estado: 'en_curso', valor_actual: '23%', responsable: 'Rosa Huamán',   fecha_inicio: '2026-01-15', fecha_fin: '2026-09-30' },
    { id: 4, organizacion_id: 1, codigo: 'OBJ-004', nombre: 'Completar y probar el Plan de Continuidad de Negocio', descripcion: 'Finalizar la redacción del BCP, validar pruebas de restauración y ejecutar simulacro.',  indicador: '% avance del BCP (redacción + simulacro)', meta: '100%', estado: 'en_curso', valor_actual: '40%', responsable: 'José Quispe',    fecha_inicio: '2026-02-01', fecha_fin: '2026-07-31' },
    { id: 5, organizacion_id: 1, codigo: 'OBJ-005', nombre: 'Cobertura MFA al 100% de usuarios activos',      descripcion: 'Forzar la activación de MFA en todas las cuentas activas, incluidas las de servicio.',          indicador: '% usuarios con MFA habilitado',         meta: '100%',  estado: 'en_curso', valor_actual: '82%', responsable: 'Luis Mendoza',  fecha_inicio: '2026-01-15', fecha_fin: '2026-06-30' },
    { id: 6, organizacion_id: 1, codigo: 'OBJ-006', nombre: 'Cerrar todas las NC mayores antes de auditoría externa', descripcion: 'No mantener NC mayores abiertas previo a la auditoría externa de certificación.',     indicador: 'N° NC mayores abiertas',                meta: '0',     estado: 'en_curso', valor_actual: '3',   responsable: 'Carla Ríos',    fecha_inicio: '2026-04-01', fecha_fin: '2026-08-31' },
  ],

  // Dashboard KPIs derivados
  dashboard: {
    sgsiMaturity: 73,
    controlsImplemented: 68,
    controlsApplicable: 92,
    openRisks: 12,
    criticalRisks: 2,
    openNCs: 9,
    nextAudit: '15-Sep-2026',
    daysToAudit: 140,
    docsCompliance: 91,
    trainingCompletion: 87,
    incidentsLast30: 4,
    timeline: [
      { mes: 'Nov', valor: 58 },
      { mes: 'Dic', valor: 61 },
      { mes: 'Ene', valor: 64 },
      { mes: 'Feb', valor: 65 },
      { mes: 'Mar', valor: 70 },
      { mes: 'Abr', valor: 73 },
    ],
  },
};

// Backward-compatible alias — keep old code paths working until they're
// migrated in later stages.
window.SGSI_DATA.contexto = {
  organizacion: window.SGSI_DATA.organizacion,
  sedes: window.SGSI_DATA.sedes,
  factores: window.SGSI_DATA.factores,
  partes: window.SGSI_DATA.partes_interesadas,
  procesos: window.SGSI_DATA.procesos,
  activos: window.SGSI_DATA.activos,
  proceso_activo: window.SGSI_DATA.proceso_activo,
};

// Legacy alcance shape — derived from sedes & procesos with incluido_alcance
window.SGSI_DATA.alcance = {
  alcance_sgsi: window.SGSI_DATA.organizacion.alcance_sgsi,
  sedes: window.SGSI_DATA.sedes,
  procesos: window.SGSI_DATA.procesos,
};

// Legacy annexA.controls — recompuesto desde controles_anexo_a + control_soa
// para que la UI actual de SoA siga renderizando sin cambios. Se eliminará
// cuando las pantallas lean directamente de las dos tablas separadas.
(function buildLegacyAnnexAControls() {
  const cat = window.SGSI_DATA.controles_anexo_a || [];
  const soa = window.SGSI_DATA.control_soa || [];
  const byCatId = Object.fromEntries(soa.map(s => [s.control_anexo_a_id, s]));
  window.SGSI_DATA.annexA.controls = cat.map(c => {
    const s = byCatId[c.id] || {};
    return {
      // legacy shape consumida por screens-m3.jsx / DetailPanel
      id: c.codigo,                  // 'A.5.1'
      name: c.nombre,
      theme: c.dominio,
      applies: s.aplica !== false,
      status: s.estado || 'no_iniciado',
      justification: s.justificacion || '',
      owner: s.owner || '—',
      // referencias canónicas para futuras migraciones
      control_anexo_a_id: c.id,
      control_soa_id: s.id,
      descripcion: c.descripcion,
      evidencia: s.evidencia,
      observaciones: s.observaciones,
      fecha_revision: s.fecha_revision,
    };
  });
})();
