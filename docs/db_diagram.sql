-- =============================================================================
-- DIAGRAMA DE BASE DE DATOS — GrowthSI SGSI
-- PostgreSQL 16 · pgvector · Prisma 6
-- Generado: 2026-06-15
--
-- Dominios lógicos:
--   [CORE]        tenant, organizacion, usuario, revision_alcance
--   [CONTEXTO]    sede, factor, partes_interesadas, rol_sgsi,
--                 proceso, activo_informacion, proceso_activo
--   [DOCS]        documento_obligatorio, documento, documento_historial,
--                 objetivo_sgsi, medicion_objetivo, aprobacion
--   [RIESGOS]     escenario_riesgo, riesgo, riesgo_historial,
--                 actividad_riesgo
--   [CONTROLES]   controles_anexo_a, control_soa, control_actividad,
--                 riesgo_control
--   [AUDITORÍAS]  auditoria, auditoria_hallazgo, no_conformidades
--   [DIRECCIÓN]   revision_direccion, revision_direccion_accion
--   [IA]          vector_chunk, vector_global, ingestion_job, ia_uso
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector para embeddings 1536-dim


-- =============================================================================
-- [CORE] — Tenant, Organización, Usuario
-- =============================================================================

-- Multi-tenant root. 1 empresa PYME = 1 tenant = 1 organizacion (modelo actual).
-- entra_tenant_id: tid del directorio Microsoft Entra (1:1). NULL = solo credentials.
CREATE TABLE tenant (
    id                  SERIAL       PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    plan                VARCHAR(50)  NOT NULL,                  -- free | pro | enterprise
    activo              BOOLEAN      NOT NULL DEFAULT TRUE,
    entra_tenant_id     VARCHAR(64)  UNIQUE,                    -- tid Entra (HU62)
    auth_method         VARCHAR(20)  NOT NULL DEFAULT 'credentials', -- credentials | entra | both
    consent_status      VARCHAR(20),                            -- pending | granted | revoked
    consent_granted_at  TIMESTAMP(6),
    default_rol_jit     VARCHAR(40)  DEFAULT 'Auditor',         -- rol para usuarios JIT (HU63)
    created_at          TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

-- Organización dentro del tenant. Contiene toda la información SGSI de la empresa.
-- alcance_modificado_at dispara el banner de "revisar módulo" en Documentos/Riesgos/Controles.
CREATE TABLE organizacion (
    id                    SERIAL       PRIMARY KEY,
    tenant_id             INT          NOT NULL REFERENCES tenant(id),
    codigo                VARCHAR(30)  NOT NULL UNIQUE,
    nombre_organizacion   VARCHAR(180) NOT NULL,
    ruc                   VARCHAR(11)  NOT NULL UNIQUE,
    sector                VARCHAR(100) NOT NULL,
    numero_colaboradores  INT          NOT NULL,
    dominio               VARCHAR(120) NOT NULL,
    mision                TEXT         NOT NULL,
    vision                TEXT         NOT NULL,
    estado_sgsi           VARCHAR(50)  NOT NULL,
    inicio_proyecto       DATE         NOT NULL,
    estado                VARCHAR(40)  NOT NULL DEFAULT 'activo',
    alcance_sgsi          TEXT,
    alcance_modificado_at TIMESTAMP(6),
    criterio_riesgo_p     INT,                                  -- escala probabilidad (ej. 5)
    criterio_riesgo_i     INT,                                  -- escala impacto (ej. 5)
    apetito_riesgo        INT,                                  -- nivel ≤ apetito = dentro (6.1.2)
    tolerancia_riesgo     INT,                                  -- nivel > tolerancia = fuera
    created_at            TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP(6) DEFAULT NOW(),
    deleted_at            TIMESTAMP(6)
);

-- Usuario del tenant. Puede autenticarse por credentials o Entra SSO (JIT).
-- azure_oid: oid del usuario en Entra ID; único global (sin colisión entre tenants).
CREATE TABLE usuario (
    id               SERIAL       PRIMARY KEY,
    organizacion_id  INT          NOT NULL REFERENCES organizacion(id),
    nombre           VARCHAR(150) NOT NULL,
    correo           VARCHAR(180) NOT NULL UNIQUE,
    password_hash    VARCHAR(255),                              -- NULL si solo Entra
    funcion          VARCHAR(120) NOT NULL,
    rol              VARCHAR(80)  NOT NULL,                     -- Administrador | CISO | Auditor | Gerencia | Colaborador
    area             VARCHAR(100) NOT NULL,
    mfa_activo       BOOLEAN      NOT NULL DEFAULT FALSE,
    azure_oid        VARCHAR(128) UNIQUE,                       -- oid Entra (HU05)
    auth_provider    VARCHAR(20)  NOT NULL DEFAULT 'credentials', -- credentials | entra
    ultimo_acceso_at TIMESTAMP(6),
    estado           VARCHAR(40)  NOT NULL DEFAULT 'activo',
    created_at       TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP(6) DEFAULT NOW(),
    deleted_at       TIMESTAMP(6)
);

-- Marca de "revisado" por módulo tras cambio del alcance.
-- Banner de módulo = atendido si revisado_at >= alcance_modificado_at de la org.
CREATE TABLE revision_alcance (
    id              SERIAL       PRIMARY KEY,
    organizacion_id INT          NOT NULL REFERENCES organizacion(id),
    modulo          VARCHAR(20)  NOT NULL,                      -- documentos | riesgos | controles
    revisado_at     TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    revisado_por    INT          REFERENCES usuario(id),
    created_at      TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revision_alcance_org_modulo ON revision_alcance(organizacion_id, modulo);


-- =============================================================================
-- [CONTEXTO] — Sede, Factor, Partes Interesadas, Rol SGSI, Proceso, Activo
-- =============================================================================

-- Sedes físicas de la organización (cláusula 4.3).
CREATE TABLE sede (
    id                SERIAL       PRIMARY KEY,
    organizacion_id   INT          NOT NULL REFERENCES organizacion(id),
    codigo            VARCHAR(30)  NOT NULL,
    nombre_sede       VARCHAR(150) NOT NULL,
    pais_sede         VARCHAR(80)  NOT NULL,
    departamento_sede VARCHAR(80)  NOT NULL,
    provincia_sede    VARCHAR(80)  NOT NULL,
    distrito_sede     VARCHAR(80)  NOT NULL,
    incluido_alcance  BOOLEAN      NOT NULL DEFAULT TRUE,
    estado            VARCHAR(40)  NOT NULL DEFAULT 'activo',
    created_at        TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP(6) DEFAULT NOW(),
    UNIQUE (organizacion_id, codigo)
);

-- Factores de contexto interno y externo (cláusula 4.1).
-- Solo los marcados como incluido_alcance=true se envían al sugeridor IA.
CREATE TABLE factor (
    id                   SERIAL       PRIMARY KEY,
    organizacion_id      INT          NOT NULL REFERENCES organizacion(id),
    codigo               VARCHAR(30)  NOT NULL,
    origen               VARCHAR(20)  NOT NULL,                 -- interno | externo
    categoria            VARCHAR(80)  NOT NULL,
    tipo                 VARCHAR(40)  NOT NULL,
    descripcion          TEXT         NOT NULL,
    impacto              VARCHAR(30)  NOT NULL,
    incluido_alcance     BOOLEAN      NOT NULL DEFAULT TRUE,
    estado               VARCHAR(40)  NOT NULL DEFAULT 'activo',
    fecha_identificacion DATE         NOT NULL,
    created_at           TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP(6) DEFAULT NOW(),
    UNIQUE (organizacion_id, codigo)
);

-- Partes interesadas y sus necesidades/expectativas (cláusula 4.2).
CREATE TABLE partes_interesadas (
    id                     SERIAL       PRIMARY KEY,
    organizacion_id        INT          NOT NULL REFERENCES organizacion(id),
    codigo                 VARCHAR(30)  NOT NULL,
    nombre                 VARCHAR(150) NOT NULL,
    tipo                   VARCHAR(30)  NOT NULL,               -- interna | externa | regulador | ...
    expectativas           TEXT         NOT NULL,
    requisitos             TEXT         NOT NULL,
    relevancia             VARCHAR(30)  NOT NULL,
    contacto               VARCHAR(150) NOT NULL,
    frecuencia_interaccion VARCHAR(80)  NOT NULL,
    responsable_interno    VARCHAR(150) NOT NULL,
    estado                 VARCHAR(40)  NOT NULL DEFAULT 'activo',
    created_at             TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP(6) DEFAULT NOW(),
    UNIQUE (organizacion_id, codigo)
);

-- Roles, responsabilidades y autoridades del SGSI (cláusula 5.3).
-- Distinto de partes interesadas: aquí van los roles de gobierno (Alta Dirección, CISO, Comité…).
CREATE TABLE rol_sgsi (
    id                INT          PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    organizacion_id   INT          NOT NULL REFERENCES organizacion(id),
    codigo            VARCHAR(30)  NOT NULL,
    nombre            VARCHAR(150) NOT NULL,
    tipo              VARCHAR(30)  NOT NULL,                    -- Individual | Órgano colegiado
    descripcion       TEXT         NOT NULL,
    responsabilidades TEXT         NOT NULL,
    autoridades       TEXT         NOT NULL,
    usuario_id        INT          REFERENCES usuario(id),      -- titular asignado
    estado            VARCHAR(40)  NOT NULL DEFAULT 'activo',
    created_at        TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP(6) DEFAULT NOW(),
    UNIQUE (organizacion_id, codigo)
);

-- Procesos del negocio. Incluido_alcance=true → dentro del alcance del SGSI (4.3).
CREATE TABLE proceso (
    id               SERIAL       PRIMARY KEY,
    organizacion_id  INT          NOT NULL REFERENCES organizacion(id),
    codigo           VARCHAR(30)  NOT NULL,
    nombre           VARCHAR(180) NOT NULL,
    tipo             VARCHAR(50)  NOT NULL,
    area             VARCHAR(100) NOT NULL,
    criticidad       VARCHAR(30)  NOT NULL,
    kpis             TEXT         NOT NULL,
    descripcion      TEXT         NOT NULL,
    incluido_alcance BOOLEAN      NOT NULL DEFAULT TRUE,
    estado           VARCHAR(40)  NOT NULL DEFAULT 'activo',
    created_at       TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP(6) DEFAULT NOW(),
    deleted_at       TIMESTAMP(6),
    UNIQUE (organizacion_id, codigo)
);

-- Activos de información que el SGSI protege (cláusula 8.1 / Anexo A 5.9–5.12).
-- exposicion: interna | externa | nube — pondera probabilidad en riesgos técnicos.
CREATE TABLE activo_informacion (
    id               SERIAL       PRIMARY KEY,
    organizacion_id  INT          NOT NULL REFERENCES organizacion(id),
    codigo           VARCHAR(30)  NOT NULL,
    nombre           VARCHAR(180) NOT NULL,
    tipo             VARCHAR(60)  NOT NULL,
    formato          VARCHAR(40)  NOT NULL,
    ubicacion        VARCHAR(200) NOT NULL,
    clasificacion    VARCHAR(60)  NOT NULL,
    confidencialidad VARCHAR(30)  NOT NULL,
    integridad       VARCHAR(30)  NOT NULL,
    disponibilidad   VARCHAR(30)  NOT NULL,
    valoracion       VARCHAR(30)  NOT NULL,
    estado           VARCHAR(40)  NOT NULL DEFAULT 'activo',
    modelo           VARCHAR(180) NOT NULL,
    version          VARCHAR(180) NOT NULL,
    proveedor        VARCHAR(180) NOT NULL,
    exposicion       VARCHAR(20),                               -- interna | externa | nube
    created_at       TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP(6) DEFAULT NOW(),
    deleted_at       TIMESTAMP(6),
    UNIQUE (organizacion_id, codigo)
);

-- Relación M:M proceso ↔ activo_informacion.
CREATE TABLE proceso_activo (
    activo_informacion_id INT         NOT NULL REFERENCES activo_informacion(id),
    proceso_id            INT         NOT NULL REFERENCES proceso(id),
    tipo_relacion         VARCHAR(50) NOT NULL,
    criticidad_relacion   VARCHAR(30) NOT NULL,
    created_at            TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    PRIMARY KEY (activo_informacion_id, proceso_id)
);


-- =============================================================================
-- [DOCS] — Documento, Objetivo SGSI, Medición, Aprobación
-- =============================================================================

-- Catálogo GLOBAL de información documentada obligatoria ISO/IEC 27001:2022.
-- Compartido entre todos los tenants; no tiene organizacion_id.
-- modulo: módulo de la aplicación que satisface este ítem.
CREATE TABLE documento_obligatorio (
    id          SERIAL       PRIMARY KEY,
    codigo      VARCHAR(20)  NOT NULL UNIQUE,
    clausula    VARCHAR(20)  NOT NULL,
    nombre      VARCHAR(200) NOT NULL,
    tipo        VARCHAR(20)  NOT NULL,                          -- Documento | Registro
    modulo      VARCHAR(20)  NOT NULL,                          -- documentos | alcance | soa | objetivos | auditorias | nc | riesgos
    descripcion TEXT         NOT NULL,
    orden       INT          NOT NULL DEFAULT 0
);

-- Documentos del SGSI (políticas, procedimientos, registros).
-- contenido: HTML editable in-app. archivo_url: clave de blob privado (.docx adjunto).
-- obligatorio_id → vincula con el catálogo global (null = documento libre).
CREATE TABLE documento (
    id              SERIAL       PRIMARY KEY,
    organizacion_id INT          NOT NULL REFERENCES organizacion(id),
    codigo          VARCHAR(40)  NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(60)  NOT NULL,
    obligatorio     BOOLEAN      NOT NULL,
    descripcion     TEXT         NOT NULL,
    contenido       TEXT,                                       -- HTML; NULL hasta que se redacta
    version         VARCHAR(20)  NOT NULL,
    archivo_url     TEXT,                                       -- clave blob privado (.docx)
    archivo_nombre  VARCHAR(255),
    obligatorio_id  INT          REFERENCES documento_obligatorio(id),
    estado          VARCHAR(40)  NOT NULL DEFAULT 'borrador',   -- borrador | revisión | aprobado | obsoleto
    created_at      TIMESTAMP(6) DEFAULT NOW(),
    updated_at      TIMESTAMP(6) DEFAULT NOW(),
    deleted_at      TIMESTAMP(6),
    UNIQUE (organizacion_id, codigo)
);

-- Historial de cambios de un documento (HU24 — trazabilidad para Auditor).
-- Snapshot ANTES de aplicar el cambio; permite reconstruir quién cambió qué y cuándo.
CREATE TABLE documento_historial (
    id             BIGSERIAL    PRIMARY KEY,
    documento_id   INT          NOT NULL REFERENCES documento(id) ON DELETE CASCADE,
    version        VARCHAR(20)  NOT NULL,                       -- versión snapshotteada
    nombre         VARCHAR(200) NOT NULL,
    estado         VARCHAR(40)  NOT NULL,
    contenido      TEXT,
    cambio_resumen TEXT,
    usuario_id     INT          REFERENCES usuario(id),
    created_at     TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_historial_doc ON documento_historial(documento_id, created_at);

-- Objetivos de seguridad de la información (cláusula 6.2).
-- P2: meta_valor + meta_operador + unidad + frecuencia hacen la meta MEDIBLE (9.1).
-- Si meta_valor IS NULL → objetivo cualitativo (evaluado por estado manual).
CREATE TABLE objetivo_sgsi (
    id              SERIAL       PRIMARY KEY,
    organizacion_id INT          NOT NULL REFERENCES organizacion(id),
    codigo          VARCHAR(30)  NOT NULL,
    nombre          VARCHAR(180) NOT NULL,
    descripcion     TEXT         NOT NULL,
    indicador       VARCHAR(180) NOT NULL,
    meta            VARCHAR(120) NOT NULL,                      -- descripción textual de la meta
    estado          VARCHAR(40)  NOT NULL DEFAULT 'activo',     -- activo | aprobado | cerrado
    meta_valor      FLOAT,                                      -- umbral numérico (P2; NULL = cualitativo)
    meta_operador   VARCHAR(4)   NOT NULL DEFAULT '>=',         -- >= | <= | = | > | <
    unidad          VARCHAR(40),                                -- %, incidentes, días, escala...
    frecuencia      VARCHAR(40),                                -- mensual | trimestral | semestral | anual
    created_at      TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP(6) DEFAULT NOW(),
    UNIQUE (organizacion_id, codigo)
);

-- Mediciones periódicas de un objetivo (P2 — cláusula 9.1).
-- cumplimiento = cumpleMeta(valor, meta_operador, meta_valor) — determinista, sin IA.
CREATE TABLE medicion_objetivo (
    id                        SERIAL       PRIMARY KEY,
    objetivo_id               INT          NOT NULL REFERENCES objetivo_sgsi(id) ON DELETE CASCADE,
    fecha_medicion            DATE         NOT NULL,
    valor                     FLOAT        NOT NULL,
    nota                      TEXT         NOT NULL DEFAULT '',
    registrado_por_usuario_id INT          REFERENCES usuario(id),
    created_at                TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicion_objetivo_obj ON medicion_objetivo(objetivo_id);

-- Flujo de aprobación genérico (alcance | objetivo | documento).
-- entidad_id: id del registro aprobado en su tabla de origen (tipo_entidad).
CREATE TABLE aprobacion (
    id                SERIAL       PRIMARY KEY,
    organizacion_id   INT          NOT NULL REFERENCES organizacion(id),
    codigo            VARCHAR(30)  NOT NULL,
    tipo_entidad      VARCHAR(40)  NOT NULL,                    -- alcance | objetivo | documento
    entidad_id        BIGINT       NOT NULL,
    comentario        TEXT         NOT NULL,
    fecha_solicitud   TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    fecha_respuesta   TIMESTAMP(6),                             -- NULL hasta que se responde
    fecha_vencimiento DATE         NOT NULL,
    estado            VARCHAR(40)  NOT NULL DEFAULT 'pendiente', -- pendiente | aprobado | rechazado
    created_at        TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP(6) DEFAULT NOW(),
    UNIQUE (organizacion_id, codigo)
);


-- =============================================================================
-- [RIESGOS] — Escenario, Riesgo, Historial, Actividad
-- =============================================================================

-- Escenario de riesgo: contexto amenaza/vulnerabilidad (ISO 27005 / 6.1.2).
-- origen: manual | ia. Solo los 'activos' se incluyen en la evaluación.
CREATE TABLE escenario_riesgo (
    id               SERIAL       PRIMARY KEY,
    organizacion_id  INT          NOT NULL REFERENCES organizacion(id),
    codigo           VARCHAR(30)  NOT NULL UNIQUE,
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT         NOT NULL,
    amenaza          VARCHAR(180) NOT NULL,
    vulnerabilidad   VARCHAR(180) NOT NULL,
    dominio          VARCHAR(40),                               -- tecnologico | organizacional | personas | fisico
    origen           VARCHAR(20)  NOT NULL DEFAULT 'manual',   -- manual | ia
    justificacion_ia TEXT,                                      -- citas MITRE/ISO/ENISA/NVD del sugeridor
    estado           VARCHAR(40)  NOT NULL DEFAULT 'identificado', -- generado | activo | inactivo
    created_at       TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP(6) DEFAULT NOW(),
    deleted_at       TIMESTAMP(6)
);

-- Riesgo concreto derivado de un escenario. Tiene valoración inicial (inherente)
-- y actual (residual). nivel = probabilidad × impacto.
-- tratamiento: mitigar | aceptar | transferir | evitar.
CREATE TABLE riesgo (
    id                      SERIAL       PRIMARY KEY,
    escenario_riesgo_id     INT          NOT NULL REFERENCES escenario_riesgo(id),
    codigo                  VARCHAR(30)  NOT NULL UNIQUE,
    nombre                  VARCHAR(200) NOT NULL,
    descripcion             TEXT         NOT NULL,
    probabilidad_inicial    INT          NOT NULL,
    impacto_inicial         INT          NOT NULL,
    nivel_inicial           INT          NOT NULL,              -- prob_ini × imp_ini
    tratamiento             VARCHAR(80)  NOT NULL,              -- mitigar | aceptar | transferir | evitar
    probabilidad_actual     INT          NOT NULL,
    impacto_actual          INT          NOT NULL,
    nivel_actual            INT          NOT NULL,              -- prob_act × imp_act (residual)
    origen                  VARCHAR(20)  NOT NULL DEFAULT 'manual',
    estado                  VARCHAR(40)  NOT NULL DEFAULT 'identificado', -- generado | tratamiento | controlado | aceptado
    aceptado_por_usuario_id INT          REFERENCES usuario(id),
    aceptado_por_at         TIMESTAMP(6),
    created_at              TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP(6) DEFAULT NOW(),
    deleted_at              TIMESTAMP(6)
);

-- Trazabilidad de reevaluaciones del riesgo (cambios en prob/impacto actual).
-- Snapshot ANTES de cambiar; justificación obligatoria.
CREATE TABLE riesgo_historial (
    id                    BIGSERIAL    PRIMARY KEY,
    riesgo_id             INT          NOT NULL REFERENCES riesgo(id) ON DELETE CASCADE,
    probabilidad_anterior INT          NOT NULL,
    impacto_anterior      INT          NOT NULL,
    nivel_anterior        INT          NOT NULL,
    probabilidad_nueva    INT          NOT NULL,
    impacto_nueva         INT          NOT NULL,
    nivel_nuevo           INT          NOT NULL,
    justificacion         TEXT         NOT NULL,
    usuario_id            INT          REFERENCES usuario(id),
    created_at            TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_riesgo_historial_riesgo ON riesgo_historial(riesgo_id, created_at);

-- Actividades de tratamiento de un riesgo (plan de acción).
-- nivel_resultante = prob × impacto proyectado tras la actividad.
CREATE TABLE actividad_riesgo (
    id                      SERIAL       PRIMARY KEY,
    riesgo_id               INT          NOT NULL REFERENCES riesgo(id),
    codigo                  VARCHAR(30)  NOT NULL UNIQUE,
    descripcion             TEXT         NOT NULL,
    tipo_actividad          VARCHAR(50)  NOT NULL,
    fecha_inicio            DATE         NOT NULL,
    fecha_vencimiento       DATE         NOT NULL,
    fecha_cierre            DATE,                               -- NULL hasta cerrar
    probabilidad_resultante INT          NOT NULL,
    impacto_resultante      INT          NOT NULL,
    nivel_resultante        INT          NOT NULL,
    resultado               TEXT         NOT NULL,
    evidencia_url           TEXT         NOT NULL,
    estado                  VARCHAR(40)  NOT NULL DEFAULT 'pendiente', -- pendiente | en_progreso | cerrada
    created_at              TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP(6) NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- [CONTROLES] — Catálogo Anexo A, SoA, Actividades, Relación Riesgo-Control
-- =============================================================================

-- Catálogo GLOBAL de los 93 controles del Anexo A de ISO/IEC 27001:2022.
-- Solo lectura; compartido entre todos los tenants.
-- dominio: Organizacional (5) | Personas (6) | Físico (7) | Tecnológico (8).
CREATE TABLE controles_anexo_a (
    id          SERIAL       PRIMARY KEY,
    codigo      VARCHAR(20)  NOT NULL UNIQUE,                   -- 5.1, 5.2, ... 8.34
    nombre      VARCHAR(250) NOT NULL,
    dominio     VARCHAR(50)  NOT NULL,
    descripcion TEXT         NOT NULL
);

-- Declaración de Aplicabilidad por organización (SoA — 6.1.3).
-- aplica: el control es aplicable. estado: no_iniciado → planificado → parcial → implementado.
-- evidencia_documento_id → documento formal del módulo Documentos que sustenta el control.
-- rol_sgsi_id + responsable_usuario_id → cláusula 5.3 (quién implementa).
CREATE TABLE control_soa (
    id                     SERIAL       PRIMARY KEY,
    control_anexo_a_id     INT          NOT NULL REFERENCES controles_anexo_a(id),
    organizacion_id        INT          NOT NULL REFERENCES organizacion(id),
    aplica                 BOOLEAN      NOT NULL DEFAULT FALSE,
    estado                 VARCHAR(40)  NOT NULL DEFAULT 'no_iniciado', -- generado | no_iniciado | planificado | parcial | implementado | no_aplica
    justificacion          TEXT         NOT NULL,
    evidencia              TEXT         NOT NULL,               -- nota libre de evidencia
    evidencia_documento_id INT          REFERENCES documento(id),
    observaciones          TEXT         NOT NULL,
    fecha_revision         DATE         NOT NULL,
    origen                 VARCHAR(20)  NOT NULL DEFAULT 'manual', -- manual | ia
    justificacion_ia       TEXT,
    rol_sgsi_id            INT          REFERENCES rol_sgsi(id),
    responsable_usuario_id INT          REFERENCES usuario(id),
    created_at             TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP(6) DEFAULT NOW(),
    UNIQUE (control_anexo_a_id, organizacion_id)
);

-- Tareas de implementación dentro de un control (plan de actividades).
-- El estado del control NO cambia automáticamente; decisión manual del CISO.
CREATE TABLE control_actividad (
    id                     SERIAL       PRIMARY KEY,
    control_soa_id         INT          NOT NULL REFERENCES control_soa(id) ON DELETE CASCADE,
    descripcion            TEXT         NOT NULL,
    responsable_usuario_id INT          REFERENCES usuario(id),
    fecha_objetivo         DATE,
    estado                 VARCHAR(20)  NOT NULL DEFAULT 'pendiente', -- pendiente | en_progreso | hecho
    orden                  INT          NOT NULL DEFAULT 0,
    created_at             TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP(6) DEFAULT NOW()
);

CREATE INDEX idx_control_actividad_soa ON control_actividad(control_soa_id);

-- Relación M:M riesgo ↔ control_soa (qué controles tratan qué riesgos).
CREATE TABLE riesgo_control (
    control_soa_id       INT         NOT NULL REFERENCES control_soa(id),
    riesgo_id            INT         NOT NULL REFERENCES riesgo(id),
    tipo_relacion        VARCHAR(50) NOT NULL,
    efectividad_estimada VARCHAR(30) NOT NULL,
    observaciones        TEXT        NOT NULL,
    created_at           TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    PRIMARY KEY (control_soa_id, riesgo_id)
);


-- =============================================================================
-- [AUDITORÍAS] — Auditoría, Hallazgo, No Conformidad
-- =============================================================================

-- Auditoría interna (cláusula 9.2). tipo: interna | externa | seguimiento.
-- estado: planificada | en_curso | completada | cancelada.
CREATE TABLE auditoria (
    id                SERIAL       PRIMARY KEY,
    organizacion_id   INT          NOT NULL REFERENCES organizacion(id),
    codigo            VARCHAR(40)  NOT NULL UNIQUE,
    nombre            VARCHAR(200) NOT NULL,
    tipo              VARCHAR(50)  NOT NULL,
    alcance           TEXT         NOT NULL,
    fecha_inicio      DATE         NOT NULL,
    fecha_fin         DATE         NOT NULL,
    fecha_vencimiento DATE         NOT NULL,
    estado            VARCHAR(40)  NOT NULL DEFAULT 'planificada',
    created_at        TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP(6) DEFAULT NOW(),
    deleted_at        TIMESTAMP(6)
);

-- Hallazgos detectados durante la auditoría (HU70).
-- severidad: baja | media | alta | crítica.
-- estado: abierto | en_seguimiento | cerrado.
CREATE TABLE auditoria_hallazgo (
    id           SERIAL       PRIMARY KEY,
    auditoria_id INT          NOT NULL REFERENCES auditoria(id),
    codigo       VARCHAR(30)  NOT NULL UNIQUE,
    titulo       VARCHAR(220) NOT NULL,
    descripcion  TEXT         NOT NULL,
    severidad    VARCHAR(40)  NOT NULL,
    estado       VARCHAR(40)  NOT NULL DEFAULT 'abierto',
    created_at   TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP(6) DEFAULT NOW()
);

-- No conformidades derivadas de auditoría (cláusula 10.1 — HU41–HU43, HU71).
-- Incluye causa raíz y acción correctiva (10.1 b/c). fecha_cierre NULL hasta cerrar.
CREATE TABLE no_conformidades (
    id                   SERIAL       PRIMARY KEY,
    auditoria_id         INT          NOT NULL REFERENCES auditoria(id),
    codigo               VARCHAR(30)  NOT NULL UNIQUE,
    titulo               VARCHAR(220) NOT NULL,
    descripcion          TEXT         NOT NULL,
    causa_raiz           TEXT         NOT NULL,
    accion_correctiva    TEXT         NOT NULL,
    severidad            VARCHAR(40)  NOT NULL,
    fecha_identificacion DATE         NOT NULL,
    fecha_vencimiento    DATE         NOT NULL,
    fecha_cierre         DATE,                                  -- NULL hasta cerrar
    estado               VARCHAR(40)  NOT NULL DEFAULT 'identificada', -- identificada | en_tratamiento | verificada | cerrada
    created_at           TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP(6) DEFAULT NOW(),
    deleted_at           TIMESTAMP(6)
);


-- =============================================================================
-- [DIRECCIÓN] — Revisión por la Dirección (cláusula 9.3) — P1
-- =============================================================================

-- Revisión por la Dirección (9.3). Implementada como 3.ª pestaña del módulo Auditorías.
-- insumos_snapshot: Json con los datos 9.3.2 congelados al momento de la revisión
--   (trazabilidad: reproduce el estado exacto que vio la Dirección).
-- documento_id → acta generada como Documento (tipo 'Revisión por la Dirección').
-- estado: borrador | en_revision | aprobada.
CREATE TABLE revision_direccion (
    id                      SERIAL       PRIMARY KEY,
    organizacion_id         INT          NOT NULL REFERENCES organizacion(id),
    codigo                  VARCHAR(30)  NOT NULL UNIQUE,       -- RD-NNN
    fecha_revision          DATE         NOT NULL,
    periodo_desde           DATE         NOT NULL,
    periodo_hasta           DATE         NOT NULL,
    asistentes              TEXT         NOT NULL DEFAULT '',
    conclusiones            TEXT         NOT NULL DEFAULT '',   -- salidas 9.3.3 (no IA)
    insumos_snapshot        JSONB,                              -- snapshot insumos 9.3.2
    estado                  VARCHAR(40)  NOT NULL DEFAULT 'borrador',
    documento_id            INT          REFERENCES documento(id),
    creado_por_usuario_id   INT          REFERENCES usuario(id),
    aprobado_por_usuario_id INT          REFERENCES usuario(id),
    aprobado_at             TIMESTAMP(6),
    created_at              TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP(6) DEFAULT NOW(),
    deleted_at              TIMESTAMP(6)
);

-- Acciones de mejora acordadas en la revisión (salidas 9.3.3 — acciones concretas).
-- tipo: mejora | cambio_control | cambio_objetivo | recurso | politica | otro.
-- estado: pendiente | en_progreso | hecho | cancelada.
-- Las acciones de la revisión N se vuelven insumo de la revisión N+1 (9.3.2 a).
CREATE TABLE revision_direccion_accion (
    id                     SERIAL       PRIMARY KEY,
    revision_direccion_id  INT          NOT NULL REFERENCES revision_direccion(id) ON DELETE CASCADE,
    descripcion            TEXT         NOT NULL,
    tipo                   VARCHAR(40)  NOT NULL DEFAULT 'mejora',
    responsable_usuario_id INT          REFERENCES usuario(id),
    prioridad              VARCHAR(20)  NOT NULL DEFAULT 'media', -- alta | media | baja
    fecha_objetivo         DATE,
    estado                 VARCHAR(40)  NOT NULL DEFAULT 'pendiente',
    fecha_cierre           DATE,
    created_at             TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP(6) DEFAULT NOW()
);

CREATE INDEX idx_rev_dir_accion_rev ON revision_direccion_accion(revision_direccion_id);


-- =============================================================================
-- [IA] — Vectorización, Ingesta, Uso de tokens
-- =============================================================================

-- Vector store POR TENANT: embeddings de registros propios (factores, activos, riesgos…).
-- embedding: vector(1536) de pgvector — escritura/lectura vía $queryRaw.
CREATE TABLE vector_chunk (
    id                 SERIAL                PRIMARY KEY,
    organizacion_id    INT                   NOT NULL REFERENCES organizacion(id),
    tabla_origen       VARCHAR(80)           NOT NULL,
    registro_origen_id BIGINT                NOT NULL,
    campo_origen       VARCHAR(80)           NOT NULL,
    chunk_indice       INT                   NOT NULL,
    chunk_texto        TEXT                  NOT NULL,
    chunk_hash         VARCHAR(128)          NOT NULL,
    tokens             INT                   NOT NULL,
    embedding          vector(1536)          NOT NULL,
    modelo_embedding   VARCHAR(100)          NOT NULL,
    metadata           JSONB                 NOT NULL,
    created_at         TIMESTAMP(6)          NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP(6)
);

CREATE INDEX idx_vector_chunk_org ON vector_chunk(organizacion_id, tabla_origen);

-- Vector store GLOBAL: base de conocimiento compartida entre todos los tenants.
-- Fuentes: ISO 27001:2022 oficial, reportes sectoriales, MITRE, ENISA…
-- Sin organizacion_id — corpus público, sin PII.
CREATE TABLE vector_global (
    id               BIGSERIAL     PRIMARY KEY,
    fuente           VARCHAR(120)  NOT NULL,                    -- iso27001_2022 | sector_logistica | ...
    documento        VARCHAR(200)  NOT NULL,
    seccion          VARCHAR(120),                              -- A.5.15 | Cláusula 4.1 | ...
    chunk_indice     INT           NOT NULL,
    chunk_texto      TEXT          NOT NULL,
    chunk_hash       VARCHAR(128)  NOT NULL,
    tokens           INT           NOT NULL,
    embedding        vector(1536)  NOT NULL,
    modelo_embedding VARCHAR(100)  NOT NULL,
    metadata         JSONB         NOT NULL,
    created_at       TIMESTAMP(6)  NOT NULL DEFAULT NOW(),
    UNIQUE (fuente, chunk_hash)
);

CREATE INDEX idx_vector_global_fuente ON vector_global(fuente);

-- Cola de jobs de ingesta de documentos (PDF → chunks → embeddings).
-- En Azure: Storage Queue + worker; este registro queda como bitácora.
-- tipo: pdf_global | pdf_tenant. estado: pendiente | en_curso | completo | error.
CREATE TABLE ingestion_job (
    id              BIGSERIAL    PRIMARY KEY,
    tipo            VARCHAR(40)  NOT NULL,
    organizacion_id INT,                                        -- NULL = ingesta global
    fuente          VARCHAR(120) NOT NULL,
    blob_url        VARCHAR(500),                               -- Azure Blob URL
    ruta_local      VARCHAR(500),                               -- ruta local (dev)
    estado          VARCHAR(40)  NOT NULL DEFAULT 'pendiente',
    resultado       JSONB,                                      -- { chunks, tokens, ms } | { error }
    intentos        INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    iniciado_at     TIMESTAMP(6),
    completado_at   TIMESTAMP(6)
);

CREATE INDEX idx_ingestion_job_estado ON ingestion_job(estado, created_at);

-- Tracking de consumo de tokens IA por tenant (límite plan: 1M tokens/mes).
-- usuario_id NULL = operación background (ingesta, recálculo automático).
CREATE TABLE ia_uso (
    id              BIGSERIAL    PRIMARY KEY,
    organizacion_id INT          NOT NULL REFERENCES organizacion(id),
    usuario_id      INT,                                        -- NULL si background
    operacion       VARCHAR(60)  NOT NULL,                      -- embedding | alcance_preliminar | sugerir_riesgos | sugerir_controles
    modelo          VARCHAR(80)  NOT NULL,
    tokens_input    INT          NOT NULL DEFAULT 0,
    tokens_output   INT          NOT NULL DEFAULT 0,
    costo_usd       DECIMAL(10,6) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ia_uso_org ON ia_uso(organizacion_id, created_at);


-- =============================================================================
-- RESUMEN DE RELACIONES PRINCIPALES
-- =============================================================================
--
--  tenant (1) ──────────────────────── (N) organizacion
--  organizacion (1) ────────────────── (N) usuario
--  organizacion (1) ────────────────── (N) sede
--  organizacion (1) ────────────────── (N) factor
--  organizacion (1) ────────────────── (N) partes_interesadas
--  organizacion (1) ────────────────── (N) rol_sgsi
--  organizacion (1) ────────────────── (N) proceso
--  organizacion (1) ────────────────── (N) activo_informacion
--  proceso     (N) ─────────────────── (M) activo_informacion   [proceso_activo]
--  organizacion (1) ────────────────── (N) documento
--  documento_obligatorio (1) ───────── (N) documento
--  documento   (1) ─────────────────── (N) documento_historial
--  organizacion (1) ────────────────── (N) objetivo_sgsi
--  objetivo_sgsi (1) ───────────────── (N) medicion_objetivo
--  organizacion (1) ────────────────── (N) aprobacion
--  organizacion (1) ────────────────── (N) escenario_riesgo
--  escenario_riesgo (1) ────────────── (N) riesgo
--  riesgo (1) ──────────────────────── (N) riesgo_historial
--  riesgo (1) ──────────────────────── (N) actividad_riesgo
--  controles_anexo_a (1) ───────────── (N) control_soa
--  organizacion  (1) ───────────────── (N) control_soa
--  control_soa   (N) ───────────────── (M) riesgo               [riesgo_control]
--  control_soa   (1) ───────────────── (N) control_actividad
--  control_soa   (N) ───────────────── (1) documento            [evidencia_documento_id]
--  control_soa   (N) ───────────────── (1) rol_sgsi
--  organizacion  (1) ───────────────── (N) auditoria
--  auditoria     (1) ───────────────── (N) auditoria_hallazgo
--  auditoria     (1) ───────────────── (N) no_conformidades
--  organizacion  (1) ───────────────── (N) revision_direccion
--  revision_direccion (N) ──────────── (1) documento            [acta 9.3]
--  revision_direccion (1) ──────────── (N) revision_direccion_accion
--  organizacion  (1) ───────────────── (N) vector_chunk
--  organizacion  (1) ───────────────── (N) ia_uso
--  organizacion  (1) ───────────────── (N) revision_alcance
--
-- Tablas GLOBALES (sin organizacion_id):
--   documento_obligatorio · controles_anexo_a · vector_global · ingestion_job
-- =============================================================================
