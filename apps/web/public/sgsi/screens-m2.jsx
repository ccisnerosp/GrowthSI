// GrowthSI — M2 · Documentos aligned to DB schema
// Entidad: documento (codigo, nombre, tipo, obligatorio, descripcion, version, archivo_url, estado)

const { useState: m2uS, useRef: m2uR } = React;

// Contenido de plantilla de ejemplo por tipo de documento
const TEMPLATES = {
  'Política': {
    titulo: 'POLÍTICA DE SEGURIDAD DE LA INFORMACIÓN',
    secciones: [
      { h: '1. Objetivo', p: 'Establecer los lineamientos y compromisos de la organización para proteger la confidencialidad, integridad y disponibilidad de la información.' },
      { h: '2. Alcance', p: 'Aplica a todos los colaboradores, proveedores y terceros que accedan a los sistemas y datos de la organización.' },
      { h: '3. Marco normativo', p: 'ISO/IEC 27001:2022 · Ley 29733 de Protección de Datos Personales · Normativas sectoriales aplicables.' },
      { h: '4. Principios de seguridad', p: 'Confidencialidad: la información solo es accesible por quienes estén autorizados. Integridad: la información es exacta y completa. Disponibilidad: la información es accesible cuando se requiere.' },
      { h: '5. Responsabilidades', p: 'Oficial de Seguridad de la Información: define y supervisa la política. Gerencia: aprueba y provee recursos. Todos los colaboradores: cumplen y reportan incidentes.' },
      { h: '6. Revisión', p: 'Esta política se revisa anualmente o cuando ocurran cambios significativos en el negocio o entorno de amenazas.' },
    ],
  },
  'Procedimiento': {
    titulo: 'PROCEDIMIENTO DE [NOMBRE DEL PROCESO]',
    secciones: [
      { h: '1. Propósito', p: 'Describir los pasos para ejecutar el proceso de forma consistente, controlada y trazable.' },
      { h: '2. Alcance', p: 'Define a qué áreas, sistemas o activos aplica este procedimiento.' },
      { h: '3. Definiciones', p: 'Glosario de términos y acrónimos utilizados en el documento.' },
      { h: '4. Responsabilidades', p: 'RACI: quién es Responsable, Aprobador, Consultado e Informado en cada paso.' },
      { h: '5. Descripción del procedimiento', p: 'Paso 1: [Acción inicial]. Paso 2: [Acción siguiente]. Paso N: [Acción de cierre y registro].' },
      { h: '6. Registros y evidencias', p: 'Identificar los registros que se generan y dónde se almacenan.' },
      { h: '7. Control de cambios', p: 'Versión | Fecha | Cambio | Autor | Aprobador' },
    ],
  },
  'Plan': {
    titulo: 'PLAN DE [NOMBRE]',
    secciones: [
      { h: '1. Introducción y contexto', p: 'Justificación del plan y relación con los objetivos del SGSI.' },
      { h: '2. Objetivos del plan', p: 'Qué se busca lograr, con indicadores medibles.' },
      { h: '3. Alcance y exclusiones', p: 'Qué incluye y qué queda fuera del plan.' },
      { h: '4. Actividades y cronograma', p: 'Tabla de actividades con responsables, fechas de inicio y fin.' },
      { h: '5. Recursos necesarios', p: 'Presupuesto, personal, herramientas y tecnología requeridos.' },
      { h: '6. Riesgos del plan', p: 'Riesgos que podrían impedir el cumplimiento del plan y medidas de mitigación.' },
      { h: '7. Seguimiento y control', p: 'Frecuencia de revisión, indicadores de avance y responsables de reporte.' },
    ],
  },
  'Instructivo': {
    titulo: 'INSTRUCTIVO DE [NOMBRE]',
    secciones: [
      { h: '1. Propósito', p: 'Guía paso a paso para ejecutar una tarea técnica específica.' },
      { h: '2. Prerequisitos', p: 'Permisos, herramientas y condiciones previas necesarias.' },
      { h: '3. Pasos detallados', p: 'Paso 1: [Descripción detallada con capturas si aplica]. Paso 2: ... Paso N: Verificar resultado y documentar.' },
      { h: '4. Solución de problemas', p: 'Errores comunes y cómo resolverlos.' },
    ],
  },
  'Registro': {
    titulo: 'REGISTRO DE [NOMBRE]',
    secciones: [
      { h: 'Encabezado', p: 'Código del registro | Fecha | Responsable | Versión' },
      { h: 'Campos del registro', p: 'ID | Fecha | Descripción del evento | Responsable | Resultado | Observaciones' },
      { h: 'Instrucciones de llenado', p: 'Completar todos los campos obligatorios. Archivar evidencia adjunta cuando aplique.' },
    ],
  },
};

function ScreenDocumentos({ theme, onOpenDoc }) {
  const D = window.SGSI_DATA;
  const [docs, setDocs] = m2uS(D.documentos);
  const [filter, setFilter] = m2uS('todos');
  const [modalOpen, setModalOpen] = m2uS(false);
  const [templateModal, setTemplateModal] = m2uS(false);
  const [form, setForm] = m2uS({});
  const [selectedFile, setSelectedFile] = m2uS(null);
  const [templateType, setTemplateType] = m2uS('Política');
  const [editRow, setEditRow] = m2uS(null);
  const fileRef = m2uR(null);
  const setF = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const counts = {
    todos: docs.length,
    aprobado: docs.filter(d => d.estado === 'aprobado').length,
    revision: docs.filter(d => d.estado === 'revision').length,
    borrador: docs.filter(d => d.estado === 'borrador').length,
  };
  const filtered = filter === 'todos' ? docs : docs.filter(d => d.estado === filter);
  const estadoTone = { aprobado: 'success', revision: 'warn', borrador: 'neutral' };
  const estadoLabel = { aprobado: 'Aprobado', revision: 'En revisión', borrador: 'Borrador' };

  const inputStyle = {
    width: '100%', height: 36, padding: '0 12px',
    borderRadius: theme.r.md, border: `1px solid ${theme.border}`,
    background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff',
    color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  };
  const textareaStyle = { ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', minHeight: 70, lineHeight: 1.5 };
  const labelStyle = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: 'block', marginBottom: 6 };

  const FormField = ({ label, children, span = 1, hint }) => (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
  const Pills = ({ value, options, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const active = value === o;
        return <button key={o} type="button" onClick={() => onChange(o)} style={{ height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${active ? theme.accent : theme.border}`, background: active ? theme.accent : 'transparent', color: active ? '#fff' : theme.inkSoft, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>{o}</button>;
      })}
    </div>
  );

  // Auto-generate next código
  const nextCodigo = () => {
    const tipos = { Política: 'POL', Procedimiento: 'PRO', Instructivo: 'INS', Plan: 'PLN', Registro: 'REG', Manual: 'MAN', Formulario: 'FOR' };
    const prefix = tipos[form.tipo] || 'DOC';
    const count = docs.filter(d => d.codigo.startsWith(prefix)).length + 1;
    return `${prefix}-SGSI-${String(count).padStart(3, '0')}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setSelectedFile({ name: file.name, url: blobUrl, type: file.type, size: file.size });
      setF('archivo_url', blobUrl);
      setF('archivo_nombre', file.name);
    }
  };

  const save = () => {
    setDocs(arr => [...arr, {
      id: Date.now(), organizacion_id: 1,
      codigo: nextCodigo(),
      nombre: form.nombre || '',
      tipo: form.tipo || 'Política',
      obligatorio: !!form.obligatorio,
      descripcion: form.descripcion || '',
      version: form.version || '1.0',
      archivo_url: form.archivo_url || null,
      archivo_nombre: form.archivo_nombre || null,
      estado: form.estado || 'borrador',
    }]);
    setModalOpen(false); setForm({}); setSelectedFile(null);
  };

  const template = TEMPLATES[templateType] || TEMPLATES['Política'];

  return (
    <>
      <SectionHeader theme={theme} title="Documentos del SGSI" subtitle="Cláusula 7.5 · Información documentada — políticas, procedimientos, registros"
        actions={<>
          <AIButton theme={theme} label="Generar Plantilla" size="sm" onClick={() => setTemplateModal(true)} />
          <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setModalOpen(true); setForm({ tipo: 'Política', estado: 'borrador' }); setSelectedFile(null); }}>Nuevo documento</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KPICard theme={theme} label="Total documentos" value={docs.length} sub="información documentada" icon="doc" />
        <KPICard theme={theme} label="Aprobados" value={`${Math.round(counts.aprobado / Math.max(1, docs.length) * 100)}%`} sub={`${counts.aprobado} documentos`} icon="check" accentBg={theme.isDark ? 'rgba(52,211,153,0.18)' : '#D6F2E5'} />
        <KPICard theme={theme} label="En revisión" value={counts.revision} sub="requieren atención" icon="refresh" accentBg={theme.isDark ? 'rgba(251,191,36,0.18)' : '#FCEDC9'} />
        <KPICard theme={theme} label="Obligatorios" value={docs.filter(d => d.obligatorio).length} sub="requeridos por norma" icon="flag" />
      </div>

      <Card theme={theme} padding={0}>
        <div style={{ padding: 14, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Tabs theme={theme} value={filter} onChange={setFilter} items={[
            { id: 'todos', label: 'Todos', count: counts.todos },
            { id: 'aprobado', label: 'Aprobados', count: counts.aprobado },
            { id: 'revision', label: 'En revisión', count: counts.revision },
            { id: 'borrador', label: 'Borradores', count: counts.borrador },
          ]} />
          <div style={{ flex: 1 }} />
          <Button theme={theme} variant="ghost" size="sm" icon={<Icon name="filter" size={13} />}>Filtros</Button>
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                {['Código', 'Nombre', 'Tipo', 'Obligatorio', 'Versión', 'Archivo', 'Estado', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                  onClick={() => onOpenDoc && onOpenDoc(d)}
                  onDoubleClick={e => { e.stopPropagation(); setEditRow(d); }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: theme.inkMuted }}>{d.codigo}</td>
                  <td style={{ padding: '12px 14px', color: theme.ink, fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="doc" size={14} color={theme.accent} />
                      {d.nombre}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: theme.inkSoft }}>{d.tipo}</td>
                  <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={d.obligatorio ? 'warn' : 'neutral'} dot>{d.obligatorio ? 'Sí' : 'No'}</Badge></td>
                  <td style={{ padding: '12px 14px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{d.version || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {d.archivo_url
                      ? <Badge theme={theme} tone="success" dot>{d.archivo_nombre || 'Adjunto'}</Badge>
                      : <Badge theme={theme} tone="neutral">Sin archivo</Badge>}
                  </td>
                  <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={estadoTone[d.estado]} dot>{estadoLabel[d.estado]}</Badge></td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={e => e.stopPropagation()} style={{ background: 'transparent', border: 'none', color: theme.inkMuted, cursor: 'pointer', padding: 4 }}>
                      <Icon name="chevR" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Modal: Nuevo documento ─────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSelectedFile(null); }} theme={theme}
        title="Nuevo documento" subtitle="Complete los datos del nuevo documento."
        width={660}
        footer={<>
          <Button theme={theme} variant="ghost" onClick={() => { setModalOpen(false); setSelectedFile(null); }}>Cancelar</Button>
          <Button theme={theme} variant="primary" onClick={save} icon={<Icon name="check" size={13} />}>Guardar</Button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Código" hint="Se genera automáticamente al guardar">
            <input style={{ ...inputStyle, opacity: 0.55, cursor: 'not-allowed' }} placeholder={nextCodigo()} disabled readOnly />
          </FormField>
          <FormField label="Tipo">
            <select style={inputStyle} value={form.tipo || 'Política'} onChange={e => setF('tipo', e.target.value)}>
              {['Política', 'Procedimiento', 'Instructivo', 'Plan', 'Registro', 'Manual', 'Formulario'].map(o => <option key={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Nombre del documento" span={2}>
            <input style={inputStyle} placeholder="Nombre completo del documento" value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} />
          </FormField>
          <FormField label="Versión">
            <input style={inputStyle} placeholder="1.0" value={form.version || ''} onChange={e => setF('version', e.target.value)} />
          </FormField>
          <FormField label="Estado">
            <Pills value={form.estado || 'borrador'} options={['borrador', 'revision', 'aprobado']} onChange={v => setF('estado', v)} />
          </FormField>
          <FormField label="¿Obligatorio por norma?">
            <Pills value={form.obligatorio ? 'Sí' : (form.obligatorio === false ? 'No' : 'No')} options={['Sí', 'No']} onChange={v => setF('obligatorio', v === 'Sí')} />
          </FormField>
          <FormField label="Descripción" span={2}>
            <textarea style={textareaStyle} placeholder="Resumen del propósito y alcance del documento…" value={form.descripcion || ''} onChange={e => setF('descripcion', e.target.value)} />
          </FormField>

          {/* Adjuntar archivo */}
          <FormField label="Adjuntar documento" span={2}>
            <div style={{
              padding: 12, borderRadius: theme.r.md,
              border: `1.5px dashed ${selectedFile ? theme.accent : theme.borderStrong}`,
              background: selectedFile ? `${theme.accent}08` : 'transparent',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer', transition: 'all .15s',
            }} onClick={() => fileRef.current?.click()}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: selectedFile ? theme.accentSoft : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name={selectedFile ? 'doc' : 'upload'} size={16} color={selectedFile ? theme.accent : theme.inkMuted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {selectedFile ? (
                  <>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 11, color: theme.inkMuted }}>{(selectedFile.size / 1024).toFixed(1)} KB · Haz clic para cambiar</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: theme.ink }}>Haz clic para seleccionar un archivo</div>
                    <div style={{ fontSize: 11, color: theme.inkMuted }}>PDF, DOCX, XLSX, PNG — hasta 20 MB</div>
                  </>
                )}
              </div>
              {selectedFile && (
                <button onClick={e => { e.stopPropagation(); setSelectedFile(null); setF('archivo_url', null); setF('archivo_nombre', null); }}
                  style={{ background: 'transparent', border: 'none', color: theme.inkMuted, cursor: 'pointer', padding: 4 }}>
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.png,.jpg" style={{ display: 'none' }} onChange={handleFileChange} />
          </FormField>
        </div>
      </Modal>

      {/* ── Modal: Generar Plantilla ────────────────────────────────── */}
      <Modal open={templateModal} onClose={() => setTemplateModal(false)} theme={theme}
        title="Generar Plantilla" subtitle="Selecciona el tipo y revisa la estructura sugerida para tu documento."
        width={680}
        footer={<>
          <Button theme={theme} variant="ghost" onClick={() => setTemplateModal(false)}>Cerrar</Button>
          <Button theme={theme} variant="primary" icon={<Icon name="plus" size={13} />} onClick={() => {
            setTemplateModal(false);
            setForm({ tipo: templateType, nombre: template.titulo, estado: 'borrador', descripcion: `Plantilla generada para documento tipo ${templateType}.` });
            setModalOpen(true);
          }}>Usar como base</Button>
        </>}>
        {/* Selector de tipo */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {Object.keys(TEMPLATES).map(t => {
            const active = templateType === t;
            return (
              <button key={t} onClick={() => setTemplateType(t)} style={{
                height: 30, padding: '0 14px', borderRadius: 999,
                border: `1px solid ${active ? theme.accent : theme.border}`,
                background: active ? theme.accent : 'transparent',
                color: active ? '#fff' : theme.inkSoft,
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                transition: 'all .12s',
              }}>{t}</button>
            );
          })}
        </div>

        {/* Preview de la plantilla */}
        <div style={{
          padding: 20, borderRadius: theme.r.lg,
          background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
          border: `1px solid ${theme.border}`,
          maxHeight: 380, overflow: 'auto',
        }}>
          {/* Encabezado del doc */}
          <div style={{
            textAlign: 'center', marginBottom: 20,
            paddingBottom: 16, borderBottom: `2px solid ${theme.accent}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.1em', marginBottom: 4 }}>LogiNorte SAC · Sistema de Gestión de Seguridad de la Información</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.ink, letterSpacing: '-0.01em' }}>{template.titulo}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10, fontSize: 11, color: theme.inkMuted }}>
              <span>Código: [AUTO]</span>
              <span>Versión: 1.0</span>
              <span>Fecha: {new Date().toLocaleDateString('es-PE')}</span>
              <span>Estado: Borrador</span>
            </div>
          </div>

          {/* Secciones */}
          {template.secciones.map((sec, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: theme.ink,
                padding: '4px 0', borderBottom: `1px solid ${theme.border}`,
                marginBottom: 6, letterSpacing: '-0.005em',
              }}>{sec.h}</div>
              <div style={{ fontSize: 12, color: theme.inkSoft, lineHeight: 1.6 }}>{sec.p}</div>
            </div>
          ))}

          {/* Pie de página */}
          <div style={{
            marginTop: 20, paddingTop: 12,
            borderTop: `1px solid ${theme.border}`,
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10.5, color: theme.inkMuted,
          }}>
            <span>Aprobado por: _______________</span>
            <span>Fecha de aprobación: _______________</span>
            <span>Próxima revisión: _______________</span>
          </div>
        </div>
      </Modal>
      {/* Double-click row edit */}
      {editRow && React.createElement(window.RowEditModal, { open: true, onClose: () => setEditRow(null), theme, item: editRow })}
    </>
  );
}

window.SGSI_TEMPLATES = TEMPLATES;
Object.assign(window, { ScreenDocumentos });
