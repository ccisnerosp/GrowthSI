// SGSI Platform — App shell + routing + AI chat
const { useState: uS, useEffect: uE, useRef: uR } = React;

function AIChat({ open, onClose, theme }) {
  const [msgs, setMsgs] = uS([
    { who: 'ai', text: '¡Hola Andrea! Soy tu copiloto del SGSI. Puedo ayudarte con controles del Anexo A, generación de políticas, análisis de riesgos y dudas sobre ISO 27001:2022.' },
  ]);
  const [input, setInput] = uS('');
  const endRef = uR(null);
  uE(() => { endRef.current?.scrollIntoView?.({ block: 'end' }); }, [msgs]);

  const suggestions = [
    '¿Qué controles cubren ransomware?',
    'Generar política de control de acceso',
    'Resumir hallazgos de la auditoría AU-2026-01',
    '¿Cuál es la diferencia entre A.5.30 y A.8.13?',
  ];

  const cannedReply = (q) => {
    const lq = q.toLowerCase();
    if (lq.includes('ransomware')) return 'Para mitigar ransomware, ISO 27001:2022 te pide combinar:\n• A.8.7 Protección contra malware (EDR + actualizaciones)\n• A.8.8 Gestión de vulnerabilidades técnicas\n• A.8.13 Copia de seguridad (regla 3-2-1)\n• A.5.30 Preparación TIC para continuidad\n\nEn LogiNorte, los controles A.8.7 y A.8.15 ya están implementados; A.5.30 está en planificación. ¿Quieres que genere el plan de tratamiento del riesgo R-001?';
    if (lq.includes('política')) return 'Puedo generarla a partir de la plantilla LogiNorte. ¿Versión completa (8 secciones) o resumida (1 página)? La versión completa cubre: alcance, marco normativo, principios, RBAC, ciclo de revisión, sanciones, evidencias y control de cambios.';
    if (lq.includes('au-2026') || lq.includes('auditoría')) return 'AU-2026-01 (Controles de acceso, feb 2026) cerró con 7 hallazgos: 2 mayores y 5 menores. Los abiertos son NC-001 (cuentas privilegiadas sin revisión) y NC-002 (logs <12m). Plazo objetivo: mayo 2026.';
    if (lq.includes('a.5.30') || lq.includes('a.8.13')) return 'Buena pregunta:\n• A.5.30 (Continuidad TIC) es organizacional — exige planificación, BIA, BCP, pruebas y RTO/RPO definidos.\n• A.8.13 (Backup) es tecnológico — exige backups conforme a requisitos del negocio (frecuencia, ubicación, cifrado).\n\nNo se sustituyen: A.8.13 implementa la capacidad técnica, A.5.30 asegura el proceso end-to-end.';
    return 'Buena pregunta. En el contexto de LogiNorte SAC, te recomiendo revisar los controles relacionados en el SoA y consultar las políticas vigentes en M2 Documentos. ¿Quieres que profundice en algún punto específico?';
  };

  const send = (text) => {
    if (!text.trim()) return;
    setMsgs([...msgs, { who: 'me', text }]);
    setInput('');
    setTimeout(() => setMsgs(m => [...m, { who: 'ai', text: cannedReply(text) }]), 600);
  };

  if (!open) return null;
  return (
    <div style={{ position: 'absolute', right: 14, bottom: 14, width: 380, height: 540, zIndex: 90,
      background: theme.surfaceSolid, borderRadius: theme.r.xl,
      border: `1px solid ${theme.borderStrong}`,
      boxShadow: '0 24px 60px rgba(20,12,6,0.35)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'slideUp .2s',
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `linear-gradient(135deg, ${theme.accent}18, ${theme.accent}06)`, borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>Asistente SGSI</div>
            <div style={{ fontSize: 10.5, color: theme.inkMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.success }} /> En línea
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent', color: theme.inkMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '9px 12px',
              borderRadius: m.who === 'me' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.who === 'me' ? theme.accent : (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
              color: m.who === 'me' ? '#fff' : theme.ink,
              fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              border: m.who === 'me' ? 'none' : `1px solid ${theme.border}`,
            }}>{m.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {msgs.length <= 2 && (
        <div style={{ padding: '0 14px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} style={{
              fontSize: 10.5, padding: '5px 10px', borderRadius: 999,
              background: theme.accentSoft, color: theme.accentDeep,
              border: `1px solid ${theme.borderStrong}`, cursor: 'pointer', fontFamily: 'inherit',
            }}>{s}</button>
          ))}
        </div>
      )}
      <div style={{ padding: 12, borderTop: `1px solid ${theme.border}`, display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="Pregunta sobre ISO 27001…"
          style={{ flex: 1, height: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)', color: theme.ink, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={() => send(input)} style={{ width: 34, height: 34, borderRadius: 999, border: 'none', background: theme.accent, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROW EDIT MODAL — double-click any table row to open
// ─────────────────────────────────────────────────────────────
function RowEditModal({ open, onClose, theme, item }) {
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState({});
  React.useEffect(() => { if (item) setForm({ ...item }); setEditMode(false); }, [item]);
  if (!open || !item) return null;

  const skipKeys = ['id', 'organizacion_id'];
  const formatLabel = k => k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const wideKeys = ['descripcion', 'expectativas', 'requisitos', 'alcance', 'observacion', 'causa_raiz', 'accion_correctiva', 'kpis', 'mision', 'vision', 'titulo'];

  const IS = { width: '100%', height: 36, padding: '0 12px', borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff', color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
  const TA = { ...IS, height: 'auto', padding: '8px 12px', resize: 'vertical', minHeight: 68, lineHeight: 1.5 };

  const renderEdit = (key, val) => {
    if (typeof val === 'boolean') return (
      <div style={{ display: 'flex', gap: 6 }}>
        {['Sí', 'No'].map(o => { const a = form[key] === (o === 'Sí'); return <button key={o} type="button" onClick={() => setForm(f => ({ ...f, [key]: o === 'Sí' }))} style={{ height: 30, padding: '0 10px', borderRadius: 999, border: `1px solid ${a ? theme.accent : theme.border}`, background: a ? theme.accent : 'transparent', color: a ? '#fff' : theme.inkSoft, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>{o}</button>; })}
      </div>
    );
    if (wideKeys.some(w => key.includes(w))) return <textarea style={TA} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />;
    if (key.includes('fecha') || key.endsWith('_at')) return <input style={IS} type="date" value={(form[key] || '').slice(0, 10)} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />;
    return <input style={IS} type="text" value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />;
  };
  const renderRead = (key, val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    if (Array.isArray(val)) return val.join(', ') || '—';
    return String(val) || '—';
  };

  const fields = Object.entries(item).filter(([k]) => !skipKeys.includes(k));
  const title = item.nombre || item.nombre_sede || item.titulo || (item.descripcion || '').slice(0, 60) || 'Registro';
  const code  = item.codigo || '';

  return (
    <Modal open={open} onClose={onClose} theme={theme}
      title={title}
      subtitle={`${code ? code + ' · ' : ''}${editMode ? 'Editando' : 'Ver detalles'}`}
      width={700}
      footer={<>
        <Button theme={theme} variant="ghost" onClick={onClose}>Cerrar</Button>
        {!editMode
          ? <Button theme={theme} variant="primary" icon={<Icon name="edit" size={13} />} onClick={() => setEditMode(true)}>Editar</Button>
          : <>
              <Button theme={theme} variant="ghost" onClick={() => { setEditMode(false); setForm({ ...item }); }}>Cancelar</Button>
              <Button theme={theme} variant="primary" icon={<Icon name="check" size={13} />} onClick={() => setEditMode(false)}>Guardar cambios</Button>
            </>}
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {fields.map(([key, val]) => (
          <div key={key} style={{ gridColumn: wideKeys.some(w => key.includes(w)) ? 'span 2' : 'span 1' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{formatLabel(key)}</div>
            {editMode
              ? renderEdit(key, val)
              : <div style={{ fontSize: 13, color: theme.ink, padding: '8px 12px', borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, minHeight: 36, display: 'flex', alignItems: 'center', wordBreak: 'break-word' }}>{renderRead(key, form[key])}</div>}
          </div>
        ))}
      </div>
    </Modal>
  );
}
window.RowEditModal = RowEditModal;

// ─────────────────────────────────────────────────────────────
// PDF VIEWER MODAL
// ─────────────────────────────────────────────────────────────
function PdfViewerModal({ open, onClose, theme, doc }) {
  if (!open || !doc) return null;
  const tpl = (window.SGSI_TEMPLATES || {})[doc.tipo] || null;
  return (
    <Modal open={open} onClose={onClose} theme={theme}
      title={doc.nombre}
      subtitle={`${doc.codigo} · ${doc.tipo} · v${doc.version || '1.0'}`}
      width={800}
      footer={<Button theme={theme} variant="ghost" onClick={onClose}>Cerrar</Button>}>
      <div style={{ background: theme.isDark ? '#1a1814' : '#e8e5df', borderRadius: theme.r.md, padding: '16px 16px 24px', overflow: 'auto', maxHeight: 520 }}>
        {/* Barra de herramientas estilo visor PDF */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14, fontSize: 11, color: theme.inkMuted }}>
          <span>Página 1 de 1</span>
          <span style={{ padding: '2px 8px', borderRadius: 6, background: theme.surfaceSolid, border: `1px solid ${theme.border}` }}>100%</span>
        </div>
        {/* Página simulada */}
        <div style={{ background: '#fff', margin: '0 auto', width: '100%', maxWidth: 680, minHeight: 580, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.18)', padding: '52px 58px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a', lineHeight: 1.65 }}>
          {/* Encabezado */}
          <div style={{ textAlign: 'center', marginBottom: 34, paddingBottom: 18, borderBottom: '2px solid #2a251f' }}>
            <div style={{ fontSize: 9.5, fontFamily: 'Inter, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: 10 }}>LogiNorte SAC · Sistema de Gestión de Seguridad de la Información</div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 10 }}>{tpl ? tpl.titulo : doc.nombre.toUpperCase()}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, fontSize: 10.5, fontFamily: 'Inter, sans-serif', color: '#555' }}>
              <span><strong>Código:</strong> {doc.codigo}</span>
              <span><strong>Versión:</strong> {doc.version || 'v1.0'}</span>
              <span><strong>Estado:</strong> {doc.estado}</span>
              <span><strong>Vigencia:</strong> {doc.vigencia || '—'}</span>
            </div>
          </div>
          {/* Secciones */}
          {tpl ? tpl.secciones.map((s, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#111' }}>{s.h}</div>
              <div style={{ fontSize: 12.5, color: '#444', textAlign: 'justify' }}>{s.p}</div>
            </div>
          )) : (
            <div style={{ fontSize: 12.5, color: '#444' }}>
              <p style={{ marginTop: 0 }}>{doc.descripcion || 'Documento sin descripción disponible.'}</p>
              <p>Este documento fue elaborado conforme a los requisitos de la norma ISO/IEC 27001:2022 y aplica a todas las áreas del alcance definido en el SGSI de LogiNorte SAC.</p>
            </div>
          )}
          {/* Bloque de firmas */}
          <div style={{ marginTop: 44, paddingTop: 18, borderTop: '1px solid #ccc', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, fontSize: 11, fontFamily: 'Inter, sans-serif', color: '#666' }}>
            <div><div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>Elaborado por</div><div style={{ borderTop: '1px solid #aaa', paddingTop: 4 }}>{doc.autor || '—'}</div></div>
            <div><div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>Aprobado por</div><div style={{ borderTop: '1px solid #aaa', paddingTop: 4 }}>Oficial de Seguridad</div></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Detail panel — generic for risks / controls / docs
function DetailPanel({ open, onClose, theme, item, kind }) {
  const [suggestCtrlModal, setSuggestCtrlModal] = React.useState(false);
  const [selectedCtrls, setSelectedCtrls]       = React.useState([]);
  const [pdfOpen, setPdfOpen]                   = React.useState(false);
  if (!open || !item) return null;
  let title = '', subtitle = '', body = null;
  if (kind === 'doc') {
    title = item.nombre; subtitle = `${item.codigo} · ${item.tipo}`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Tipo" v={item.tipo} />
          <Field2 theme={theme} label="Versión" v={item.version || '—'} />
          <Field2 theme={theme} label="Obligatorio" v={<Badge theme={theme} tone={item.obligatorio ? 'warn' : 'neutral'} dot>{item.obligatorio ? 'Sí' : 'No'}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'aprobado' ? 'success' : item.estado === 'revision' ? 'warn' : 'neutral'} dot>{item.estado}</Badge>} />
          <Field2 theme={theme} label="Archivo" v={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, color: theme.inkSoft }}>{item.archivo_nombre || (item.archivo_url ? 'documento.pdf' : '—')}</span>
              <button onClick={() => setPdfOpen(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 30, padding: '0 12px', borderRadius: theme.r.md,
                background: theme.accentSoft, border: `1px solid ${theme.borderStrong}`,
                color: theme.accentDeep, fontSize: 12, fontWeight: 500,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>
                <Icon name="doc" size={13} color={theme.accent} /> Ver archivo
              </button>
            </div>
          } />
        </div>
        {item.descripcion && <>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Descripción</div>
          <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55 }}>{item.descripcion}</div>
        </>}
        {item.archivo_url && <>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>Contenido del documento</div>
          {(item.archivo_url.startsWith('blob:') || item.archivo_url.includes('.pdf')) ? (
            <iframe src={item.archivo_url} style={{ width: '100%', height: 380, border: `1px solid ${theme.border}`, borderRadius: theme.r.md }} title="Documento" />
          ) : (
            <a href={item.archivo_url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: theme.r.md, background: theme.accentSoft, border: `1px solid ${theme.borderStrong}`, color: theme.accentDeep, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              <Icon name="doc" size={18} color={theme.accent} />
              {item.archivo_nombre || 'Ver documento adjunto'}
            </a>
          )}
        </>}
      </>
    );
  } else if (kind === 'risk') {
    const D = window.SGSI_DATA;
    const esc = (D.escenarios_riesgo || []).find(e => e.id === item.escenario_riesgo_id);
    const nivelTone = (n) => n >= 15 ? 'danger' : n >= 10 ? 'warn' : n >= 5 ? 'info' : 'success';
    const nivelLbl  = (n) => n >= 15 ? 'Crítico' : n >= 10 ? 'Alto' : n >= 5 ? 'Medio' : 'Bajo';
    title = item.nombre; subtitle = `${item.codigo} · Riesgo`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Escenario padre" v={esc ? <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{esc.codigo}</span> : '—'} />
          <Field2 theme={theme} label="P·I inicial" v={`${item.probabilidad_inicial} × ${item.impacto_inicial}`} />
          <Field2 theme={theme} label="Nivel inicial" v={<Badge theme={theme} tone={nivelTone(item.nivel_inicial)}>{nivelLbl(item.nivel_inicial)} · {item.nivel_inicial}</Badge>} />
          <Field2 theme={theme} label="P·I actual" v={`${item.probabilidad_actual} × ${item.impacto_actual}`} />
          <Field2 theme={theme} label="Nivel actual" v={<Badge theme={theme} tone={nivelTone(item.nivel_actual)}>{nivelLbl(item.nivel_actual)} · {item.nivel_actual}</Badge>} />
          <Field2 theme={theme} label="Tratamiento" v={<Badge theme={theme} tone={item.tratamiento === 'mitigar' ? 'warn' : item.tratamiento === 'aceptar' ? 'success' : 'info'}>{item.tratamiento}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'controlado' ? 'success' : item.estado === 'aceptado' ? 'info' : 'warn'} dot>{item.estado}</Badge>} />
        </div>
        {item.descripcion && <>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Descripción</div>
          <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>{item.descripcion}</div>
        </>}
        {esc && <>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Escenario de riesgo</div>
          <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55 }}>
            <strong style={{ color: theme.ink }}>{esc.nombre}</strong><br />
            Amenaza: {esc.amenaza}<br />
            Vulnerabilidad: {esc.vulnerabilidad}
          </div>
        </>}

        {/* Historial de actividades */}
        {(window.SGSI_DATA.actividad_riesgo||[]).filter(a=>a.riesgo_id===item.id).length>0 && (
          <div style={{marginTop:16}}>
            <div style={{fontSize:11,fontWeight:600,color:theme.inkMuted,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:8}}>Historial de actividades</div>
            {(window.SGSI_DATA.actividad_riesgo||[]).filter(a=>a.riesgo_id===item.id).map(a=>(
              <div key={a.id} style={{padding:'10px 12px',borderRadius:theme.r.md,background:theme.isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.5)',border:`1px solid ${theme.border}`,marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <Badge theme={theme} tone={({Identificación:'info',Evaluación:'warn',Tratamiento:'success',Seguimiento:'accent'})[a.tipo]||'neutral'}>{a.tipo}</Badge>
                  <span style={{fontSize:10.5,color:theme.inkMuted}}>{a.fecha}</span>
                </div>
                <div style={{fontSize:12,color:theme.ink,lineHeight:1.5,marginBottom:4}}>{a.descripcion}</div>
                <div style={{fontSize:10.5,color:theme.inkMuted}}>Por: {a.responsable}</div>
              </div>
            ))}
          </div>
        )}

        {/* Controles asociados */}
        <div style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:600,color:theme.inkMuted,letterSpacing:'0.05em',textTransform:'uppercase'}}>Controles asociados ({(window.SGSI_DATA.riesgo_control||[]).filter(rc=>rc.riesgo_id===item.id).length})</div>
            <AIButton theme={theme} label="Sugerir controles" size="sm" onClick={()=>{setSuggestCtrlModal(true);setSelectedCtrls([]);}} />
          </div>
          {(window.SGSI_DATA.riesgo_control||[]).filter(rc=>rc.riesgo_id===item.id).length===0
            ? <div style={{fontSize:12,color:theme.inkMuted,fontStyle:'italic',padding:'4px 0'}}>Sin controles aún. Usa "Sugerir controles".</div>
            : (window.SGSI_DATA.riesgo_control||[]).filter(rc=>rc.riesgo_id===item.id).map((rc,i)=>(
                <div key={i} style={{padding:'10px 12px',borderRadius:theme.r.md,background:theme.isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.5)',border:`1px solid ${theme.border}`,marginBottom:6}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:10.5,fontFamily:'ui-monospace,monospace',color:theme.accentDeep,fontWeight:600,marginBottom:2}}>{rc.control_id}</div>
                      <div style={{fontSize:11.5,color:theme.inkSoft}}>{rc.observacion}</div>
                    </div>
                    <Badge theme={theme} tone={rc.estado==='implementado'?'success':rc.estado==='parcial'?'warn':'info'}>{rc.estado}</Badge>
                  </div>
                </div>
              ))
          }
        </div>
      </>
    );
  } else if (kind === 'nc') {
    const D = window.SGSI_DATA;
    const aud = (D.auditorias || []).find(a => a.id === item.auditoria_id);
    title = item.titulo; subtitle = `${item.codigo} · No conformidad`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Auditoría" v={aud ? <Badge theme={theme} tone="neutral">{aud.codigo}</Badge> : '—'} />
          <Field2 theme={theme} label="Severidad" v={<Badge theme={theme} tone={item.severidad === 'critica' ? 'danger' : item.severidad === 'mayor' ? 'warn' : 'info'}>{item.severidad}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'cerrada' ? 'success' : 'warn'} dot>{item.estado}</Badge>} />
          <Field2 theme={theme} label="F. identificación" v={item.fecha_identificacion || '—'} />
          <Field2 theme={theme} label="F. vencimiento" v={item.fecha_vencimiento || '—'} />
          <Field2 theme={theme} label="F. cierre" v={item.fecha_cierre || '—'} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Descripción</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>{item.descripcion || '—'}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Causa raíz</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>{item.causa_raiz || '—'}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Acción correctiva</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55 }}>{item.accion_correctiva || '—'}</div>
      </>
    );
  } else if (kind === 'control') {
    title = item.name; subtitle = `Control ${item.id} · Anexo A`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Aplicabilidad" v={<Badge theme={theme} tone={item.applies ? 'success' : 'neutral'} dot>{item.applies ? 'Aplica' : 'No aplica'}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.status === 'implementado' ? 'success' : item.status === 'parcial' ? 'warn' : 'info'}>{item.status}</Badge>} />
          <Field2 theme={theme} label="Responsable" v={item.owner} />
          <Field2 theme={theme} label="Tema" v={item.theme} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Justificación</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55 }}>{item.justification}</div>
      </>
    );
  } else if (kind === 'factor') {
    // Factor I/E — entidad: factor
    const tone = ({ Amenaza: 'danger', Debilidad: 'warn', Oportunidad: 'success', Fortaleza: 'success' })[item.tipo] || 'neutral';
    const impTone = ({ crítico: 'danger', alto: 'warn', medio: 'info', bajo: 'neutral' })[item.impacto] || 'neutral';
    title = item.descripcion; subtitle = `${item.codigo} · Factor ${item.origen ? item.origen.toLowerCase() : ''}`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Origen" v={<Badge theme={theme} tone={item.origen === 'Externo' ? 'info' : 'accent'}>{item.origen}</Badge>} />
          <Field2 theme={theme} label="Categoría" v={item.categoria} />
          <Field2 theme={theme} label="Tipo" v={<Badge theme={theme} tone={tone} dot>{item.tipo}</Badge>} />
          <Field2 theme={theme} label="Impacto" v={<Badge theme={theme} tone={impTone}>{item.impacto}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'activo' ? 'success' : 'neutral'} dot>{item.estado}</Badge>} />
          <Field2 theme={theme} label="Fecha de identificación" v={item.fecha_identificacion} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Descripción</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55 }}>{item.descripcion}</div>
      </>
    );
  } else if (kind === 'sede') {
    // sede
    title = item.nombre_sede; subtitle = `${item.codigo} · Sede`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Nombre" v={item.nombre_sede} />
          <Field2 theme={theme} label="País" v={item.pais_sede} />
          <Field2 theme={theme} label="Departamento" v={item.departamento_sede} />
          <Field2 theme={theme} label="Provincia" v={item.provincia_sede} />
          <Field2 theme={theme} label="Distrito" v={item.distrito_sede} />
          <Field2 theme={theme} label="Incluida en alcance" v={<Badge theme={theme} tone={item.incluido_alcance ? 'success' : 'neutral'} dot>{item.incluido_alcance ? 'Sí' : 'No'}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'activo' ? 'success' : 'neutral'} dot>{item.estado}</Badge>} />
        </div>
      </>
    );
  } else if (kind === 'parte') {
    title = item.nombre; subtitle = `${item.codigo} · Parte interesada · ${item.tipo}`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Tipo" v={<Badge theme={theme} tone={item.tipo === 'Externa' ? 'info' : 'accent'}>{item.tipo}</Badge>} />
          <Field2 theme={theme} label="Relevancia" v={<Badge theme={theme} tone={item.relevancia === 'alta' ? 'warn' : item.relevancia === 'media' ? 'info' : 'neutral'}>{item.relevancia}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'activa' ? 'success' : 'neutral'} dot>{item.estado}</Badge>} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Expectativas</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>{item.expectativas}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Requisitos</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>{item.requisitos || '—'}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Comunicación</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field2 theme={theme} label="Contacto" v={item.contacto || '—'} />
          <Field2 theme={theme} label="Frecuencia de interacción" v={item.frecuencia_interaccion} />
          <Field2 theme={theme} label="Responsable interno" v={item.responsable_interno} />
        </div>
      </>
    );
  } else if (kind === 'proceso') {
    const tipoT = ({ Misional: 'accent', Soporte: 'info', Estratégico: 'success' })[item.tipo] || 'neutral';
    const critT = item.criticidad === 'alta' ? 'danger' : item.criticidad === 'media' ? 'warn' : 'neutral';
    const D = window.SGSI_DATA;
    // activos relacionados vía proceso_activo
    const relIds = (D.proceso_activo || []).filter(pa => pa.proceso_id === item.id).map(pa => pa.activo_informacion_id);
    const linkedActivos = D.activos.filter(a => relIds.includes(a.id));
    title = item.nombre; subtitle = `${item.codigo} · ${item.area}`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Tipo" v={<Badge theme={theme} tone={tipoT}>{item.tipo}</Badge>} />
          <Field2 theme={theme} label="Área" v={item.area} />
          <Field2 theme={theme} label="Criticidad" v={<Badge theme={theme} tone={critT} dot>{item.criticidad}</Badge>} />
          <Field2 theme={theme} label="Incluido en alcance" v={<Badge theme={theme} tone={item.incluido_alcance ? 'success' : 'neutral'} dot>{item.incluido_alcance ? 'Sí' : 'No'}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'operativo' ? 'success' : 'neutral'} dot>{item.estado}</Badge>} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Descripción</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>{item.descripcion || '—'}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>KPIs / Indicadores</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>{item.kpis || '—'}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Activos de información asociados <span style={{ color: theme.inkMuted, fontWeight: 500 }}>· {linkedActivos.length} · vía proceso_activo</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {linkedActivos.length === 0 && <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: 'italic' }}>Sin activos asociados.</div>}
          {linkedActivos.map(a => {
            const rel = (D.proceso_activo || []).find(pa => pa.proceso_id === item.id && pa.activo_informacion_id === a.id);
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: theme.r.md,
                background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${theme.border}`,
              }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: theme.inkMuted, minWidth: 56 }}>{a.codigo}</span>
                <span style={{ flex: 1, fontSize: 12.5, color: theme.ink, fontWeight: 500 }}>{a.nombre}</span>
                {rel && <Badge theme={theme} tone="neutral">{rel.tipo_relacion}</Badge>}
                <Badge theme={theme} tone={a.valoracion === 'crítico' ? 'danger' : a.valoracion === 'alto' ? 'warn' : 'neutral'} dot>{a.valoracion}</Badge>
              </div>
            );
          })}
        </div>
      </>
    );
  } else if (kind === 'activo') {
    const tipoT = ({ Información: 'accent', Software: 'info', Hardware: 'warn', Personas: 'success' })[item.tipo] || 'neutral';
    const valT = ({ crítico: 'danger', alto: 'warn', medio: 'info', bajo: 'neutral' })[item.valoracion] || 'neutral';
    const clasT = item.clasificacion === 'Confidencial' ? 'danger' : item.clasificacion === 'Restringido' ? 'warn' : 'neutral';
    const cidT = (l) => l === 'alta' ? 'danger' : l === 'media' ? 'warn' : 'neutral';
    const D = window.SGSI_DATA;
    const procIds = (D.proceso_activo || []).filter(pa => pa.activo_informacion_id === item.id).map(pa => pa.proceso_id);
    const linkedProcesos = D.procesos.filter(p => procIds.includes(p.id));
    title = item.nombre; subtitle = `${item.codigo} · Activo de información`;
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Código" v={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{item.codigo}</span>} />
          <Field2 theme={theme} label="Tipo" v={<Badge theme={theme} tone={tipoT}>{item.tipo}</Badge>} />
          <Field2 theme={theme} label="Formato" v={item.formato} />
          <Field2 theme={theme} label="Clasificación" v={<Badge theme={theme} tone={clasT}>{item.clasificacion}</Badge>} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Ubicación</div>
        <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.55, marginBottom: 16 }}>{item.ubicacion}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Triada C·I·D</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Confidencialidad</div>
            <Badge theme={theme} tone={cidT(item.confidencialidad)} dot>{item.confidencialidad}</Badge>
          </div>
          <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Integridad</div>
            <Badge theme={theme} tone={cidT(item.integridad)} dot>{item.integridad}</Badge>
          </div>
          <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Disponibilidad</div>
            <Badge theme={theme} tone={cidT(item.disponibilidad)} dot>{item.disponibilidad}</Badge>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field2 theme={theme} label="Valoración global" v={<Badge theme={theme} tone={valT} dot>{item.valoracion}</Badge>} />
          <Field2 theme={theme} label="Estado" v={<Badge theme={theme} tone={item.estado === 'operativo' ? 'success' : 'neutral'} dot>{item.estado}</Badge>} />
          <Field2 theme={theme} label="Modelo" v={item.modelo || '—'} />
          <Field2 theme={theme} label="Versión" v={item.version || '—'} />
          <Field2 theme={theme} label="Proveedor" v={item.proveedor || '—'} span={2} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Procesos asociados <span style={{ color: theme.inkMuted, fontWeight: 500 }}>· {linkedProcesos.length} · vía proceso_activo</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {linkedProcesos.length === 0 && <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: 'italic' }}>Sin procesos asociados.</div>}
          {linkedProcesos.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: theme.r.md,
              background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${theme.border}`,
            }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: theme.inkMuted, minWidth: 76 }}>{p.codigo}</span>
              <span style={{ flex: 1, fontSize: 12.5, color: theme.ink, fontWeight: 500 }}>{p.nombre}</span>
              <Badge theme={theme} tone={p.criticidad === 'alta' ? 'danger' : p.criticidad === 'media' ? 'warn' : 'neutral'}>{p.criticidad}</Badge>
            </div>
          ))}
        </div>
      </>
    );
  } else if (kind === 'item') {
    title = item.desc || item.nombre; subtitle = `${item.categoria || ''} · ${item.tipo || ''}`;
    body = <Field2 theme={theme} label="Impacto" v={item.impacto || '—'} />;
  }
  return (<>
    <SidePanel open={open} onClose={onClose} theme={theme} title={title} subtitle={subtitle}
      footer={<>
        <Button theme={theme} variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        <Button theme={theme} variant="primary" size="sm" icon={<Icon name="edit" size={13} />}>Editar</Button>
      </>}>
      {body}
    </SidePanel>

    {/* PDF viewer para documentos */}
    {kind === 'doc' && <PdfViewerModal open={pdfOpen} onClose={() => setPdfOpen(false)} theme={theme} doc={item} />}

    {/* Modal: Sugerir controles (riesgo) */}
    {kind === 'risk' && (() => {
      const CPOOL = window.CONTROL_POOL_M3 || [];
      const addCtrls = () => { setSuggestCtrlModal(false); setSelectedCtrls([]); };
      return (
        <Modal open={suggestCtrlModal} onClose={() => setSuggestCtrlModal(false)} theme={theme}
          title="Sugerir controles" subtitle="Selecciona controles del Anexo A para asociar a este riesgo." width={660}
          footer={<>
            <Button theme={theme} variant="ghost" onClick={() => { setSuggestCtrlModal(false); setSelectedCtrls([]); }}>Cancelar</Button>
            <Button theme={theme} variant="primary" disabled={selectedCtrls.length === 0} icon={<Icon name="plus" size={13} />} onClick={addCtrls}>
              Asociar {selectedCtrls.length > 0 ? `(${selectedCtrls.length})` : ''}
            </Button>
          </>}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkle" size={16} color={theme.accent} />
            </div>
            <div style={{ fontSize: 12, color: theme.inkSoft, lineHeight: 1.5 }}>
              Controles del Anexo A ISO 27001:2022 recomendados para gestionar este riesgo.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {CPOOL.map((c, i) => {
              const sel = selectedCtrls.includes(i);
              const exists = (window.SGSI_DATA.riesgo_control || []).some(rc => rc.riesgo_id === (item && item.id) && rc.control_id === c.control_id);
              return (
                <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: theme.r.md, cursor: exists ? 'not-allowed' : 'pointer', background: sel ? `${theme.accent}10` : (theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)'), border: `1px solid ${sel ? theme.accent : theme.border}`, opacity: exists ? 0.45 : 1, transition: 'all .12s' }}>
                  <input type="checkbox" checked={sel} disabled={exists} onChange={() => !exists && setSelectedCtrls(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])} style={{ marginTop: 3, accentColor: theme.accent, width: 14, height: 14, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: theme.accentDeep, fontWeight: 600 }}>{c.control_id}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink }}>{c.nombre}</span>
                      {exists && <Badge theme={theme} tone="neutral">Ya asociado</Badge>}
                      <Badge theme={theme} tone="neutral" style={{ marginLeft: 'auto' }}>{c.tema}</Badge>
                    </div>
                    <div style={{ fontSize: 11.5, color: theme.inkSoft, lineHeight: 1.45 }}>{c.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </Modal>
      );
    })()}
  </>);
}
const Field2 = window.Field2;

// ─────────────────────────────────────────────────────────────
// MAIN APP SHELL
// ─────────────────────────────────────────────────────────────
function AppShell({ tweaks, setTweak }) {
  const theme = useTheme(tweaks);
  const [route, setRoute] = uS('landing');
  const [detail, setDetail] = uS({ open: false, item: null, kind: null });

  const D = window.SGSI_DATA;
  const open = (kind, item) => setDetail({ open: true, item, kind });
  const closeDetail = () => setDetail({ ...detail, open: false });

  const screenTitles = {
    dashboard: { t: 'Dashboard', s: 'Vista general del SGSI', b: 'Inicio' },
    contexto: { t: 'Contexto interno y externo', s: 'M1 · Cláusula 4.1–4.2', b: 'M1 · Contexto y alcance' },
    alcance: { t: 'Alcance del SGSI', s: 'M1 · Cláusula 4.3', b: 'M1 · Contexto y alcance' },
    documentos: { t: 'Documentos', s: 'M2 · Información documentada', b: 'M2 · Documentos' },
    riesgos: { t: 'Riesgos', s: 'M3 · Cláusula 6.1', b: 'M3 · Riesgos y SoA' },
    soa: { t: 'Declaración de Aplicabilidad', s: 'M3 · Anexo A — 93 controles', b: 'M3 · Riesgos y SoA' },
    auditorias: { t: 'Auditorías', s: 'M4 · Cláusula 9.2', b: 'M4 · Auditorías y NC' },
    nc: { t: 'No conformidades', s: 'M4 · Cláusula 10.1', b: 'M4 · Auditorías y NC' },
    usuarios: { t: 'Usuarios y roles', s: 'M6 · RBAC + Azure AD', b: 'M6 · Administración' },
  };

  // Landing & Onboarding are full-bleed
  if (route === 'landing' || route === 'onboarding' || route === 'login') {
    return (
      <div style={{
        position: 'relative',
        width: '100%', height: '100%',
        background: PALETTES[tweaks.palette]?.bgFrom,
        color: theme.ink,
        overflow: 'hidden',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        letterSpacing: '-0.005em',
      }}>
        <AuroraBg theme={theme} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', overflow: 'auto' }}>
          {route === 'landing'    && <ScreenLanding theme={theme} onGetStarted={() => setRoute('onboarding')} onLogin={() => setRoute('login')} />}
          {route === 'onboarding' && <ScreenOnboarding theme={theme} onComplete={() => setRoute('dashboard')} onBack={() => setRoute('landing')} />}
          {route === 'login'      && <ScreenLogin theme={theme} onComplete={() => setRoute('dashboard')} onBack={() => setRoute('landing')} />}
        </div>
        <BackToAppButton
          theme={theme}
          onClick={() => setRoute(route === 'landing' ? 'onboarding' : 'dashboard')}
          label={route === 'landing' ? 'Ir a onboarding →' : 'Ir al dashboard →'}
          alt={() => setRoute('landing')} altLabel="← landing" />
      </div>
    );
  }

  const sc = screenTitles[route] || screenTitles.dashboard;

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      color: theme.ink,
      overflow: 'hidden',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      letterSpacing: '-0.005em',
    }}>
      <AuroraBg theme={theme} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100%' }}>
        <Sidebar theme={theme} current={route} onNav={setRoute} mode={tweaks.sidebar} org={D.organizacion} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header theme={theme} title={sc.t} subtitle={sc.s} breadcrumb={sc.b} user={D.user} />
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 14px 14px 0' }}>
            <div style={{ minHeight: '100%' }}>
              {route === 'dashboard' && <ScreenDashboard theme={theme} user={D.user} />}
              {route === 'contexto' && <ScreenContexto theme={theme} onOpenItem={(kind, it) => open(kind, it)} />}
              {route === 'alcance' && <ScreenAlcance theme={theme} />}
              {route === 'documentos' && <ScreenDocumentos theme={theme} onOpenDoc={(d) => open('doc', d)} />}
              {route === 'riesgos' && <ScreenRiesgos theme={theme} onOpenRisk={(r) => open('risk', r)} />}
              {route === 'soa' && <ScreenSoA theme={theme} onOpenControl={(c) => open('control', c)} />}
              {route === 'auditorias' && <ScreenAuditorias theme={theme} />}
              {route === 'nc' && <ScreenNC theme={theme} onOpenNC={(n) => open('nc', n)} />}
              {route === 'usuarios' && <ScreenUsuarios theme={theme} />}
            </div>
          </div>
        </div>
      </div>

      <DetailPanel open={detail.open} item={detail.item} kind={detail.kind} theme={theme} onClose={closeDetail} />

      <BackToAppButton theme={theme} onClick={() => setRoute('landing')} label="← landing" />
    </div>
  );
}

function BackToAppButton({ theme, onClick, label, alt, altLabel }) {
  return (
    <div style={{ position: 'absolute', left: 14, bottom: 14, zIndex: 95, display: 'flex', gap: 6 }}>
      <button onClick={onClick} style={{
        height: 28, padding: '0 12px', borderRadius: 999,
        background: theme.surfaceSolid, color: theme.inkSoft,
        border: `1px solid ${theme.borderStrong}`,
        fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
        boxShadow: theme.isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(60,30,10,0.08)',
      }}>{label}</button>
      {alt && <button onClick={alt} style={{
        height: 28, padding: '0 12px', borderRadius: 999,
        background: theme.surfaceSolid, color: theme.inkSoft,
        border: `1px solid ${theme.borderStrong}`,
        fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
      }}>{altLabel}</button>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
function Root() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <>
      <AppShell tweaks={t} setTweak={setTweak} />
      <TweaksPanel>
        <TweakSection label="Tema" />
        <TweakToggle label="Modo oscuro" value={t.dark} onChange={v => setTweak('dark', v)} />
        <TweakSelect label="Paleta" value={t.palette} options={[
          { value: 'peach', label: 'Peach (recomendado)' },
          { value: 'purple', label: 'Purple' },
          { value: 'neutral', label: 'Neutral' },
        ]} onChange={v => setTweak('palette', v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Densidad" value={t.density} options={['compact', 'balanced', 'comfortable']} onChange={v => setTweak('density', v)} />
        <TweakRadio label="Sidebar" value={t.sidebar} options={['full', 'collapsed', 'icon']} onChange={v => setTweak('sidebar', v)} />
        <TweakRadio label="Cards" value={t.cards} options={['glass', 'solid', 'outlined']} onChange={v => setTweak('cards', v)} />
      </TweaksPanel>
    </>
  );
}

window.SGSI_Root = Root;
