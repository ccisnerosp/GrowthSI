// GrowthSI — M4 · Auditorías + Hallazgos + No Conformidades aligned to DB schema

const { useState: m4uS } = React;

// ── helpers ──────────────────────────────────────────────────────────
const audTone    = (e) => ({ completada: 'success', 'en-curso': 'warn', planificada: 'info' })[e] || 'neutral';
const audLabel   = (e) => ({ completada: 'Completada', 'en-curso': 'En curso', planificada: 'Planificada' })[e] || e;
const sevTone    = (s) => ({ critica: 'danger', mayor: 'warn', menor: 'info' })[s] || 'neutral';
const sevLabel   = (s) => ({ critica: 'Crítica', mayor: 'Mayor', menor: 'Menor' })[s] || s;
const ncEstTone  = (e) => ({ identificada: 'info', analisis: 'warn', plan: 'accent', ejecucion: 'warn', cerrada: 'success' })[e] || 'neutral';

// ═════════════════════════════════════════════════════════════════════
// ScreenAuditorias — tabs: Auditorías | Hallazgos
// ═════════════════════════════════════════════════════════════════════
function ScreenAuditorias({ theme }) {
  const D = window.SGSI_DATA;
  const [tab, setTab] = m4uS('auditorias');
  const [auditorias, setAuditorias] = m4uS(D.auditorias);
  const [hallazgos, setHallazgos]   = m4uS(D.auditoria_hallazgos);
  const [selectedAud, setSelectedAud] = m4uS(null);
  const [modalKind, setModalKind]   = m4uS(null);
  const [form, setForm]             = m4uS({});
  const [editRow, setEditRow]       = m4uS(null);
  const setF = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const inputStyle = { width: '100%', height: 36, padding: '0 12px', borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff', color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
  const textareaStyle = { ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', minHeight: 64, lineHeight: 1.5 };
  const labelStyle = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: 'block', marginBottom: 6 };
  const FF = ({ label, children, span = 1 }) => <div style={{ gridColumn: `span ${span}` }}><label style={labelStyle}>{label}</label>{children}</div>;
  const Pills = ({ value, options, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => { const a = value === o; return <button key={o} type="button" onClick={() => onChange(o)} style={{ height: 28, padding: '0 10px', borderRadius: 999, border: `1px solid ${a ? theme.accent : theme.border}`, background: a ? theme.accent : 'transparent', color: a ? '#fff' : theme.inkSoft, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer' }}>{o}</button>; })}
    </div>
  );

  const saveAuditoria = () => {
    const nextAuCod = `AU-${new Date().getFullYear()}-${String(auditorias.filter(a=>a.codigo.includes(String(new Date().getFullYear()))).length+1).padStart(2,'0')}`;
    setAuditorias(arr => [...arr, { id: Date.now(), organizacion_id: 1, codigo: nextAuCod, nombre: form.nombre || '', tipo: form.tipo || 'Interna', alcance: form.alcance || '', fecha_inicio: form.fecha_inicio || '', fecha_fin: form.fecha_fin || '', fecha_vencimiento: form.fecha_vencimiento || '', estado: form.estado || 'planificada' }]);
    setModalKind(null); setForm({});
  };
  const saveHallazgo = () => {
    const nextHalCod = `HAL-${String(hallazgos.length+1).padStart(3,'0')}`;
    setHallazgos(arr => [...arr, { id: Date.now(), auditoria_id: Number(form.auditoria_id) || null, codigo: nextHalCod, titulo: form.titulo || '', descripcion: form.descripcion || '', severidad: form.severidad || 'menor', estado: form.estado || 'abierto' }]);
    setModalKind(null); setForm({});
  };

  const visibleHallazgos = selectedAud
    ? hallazgos.filter(h => h.auditoria_id === selectedAud)
    : hallazgos;

  return (
    <>
      <SectionHeader theme={theme} title="Programa de auditorías" subtitle="Cláusula 9.2 · Auditorías internas, externas y a terceros del SGSI"
        actions={<>
          {tab === 'auditorias' && <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setModalKind('auditoria'); setForm({}); }}>Nueva auditoría</Button>}
          {tab === 'hallazgos'  && <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setModalKind('hallazgo');  setForm({}); }}>Nuevo hallazgo</Button>}
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KPICard theme={theme} label="Auditorías 2026" value={auditorias.filter(a => a.codigo.includes('2026')).length} sub="programadas" icon="clipboard" />
        <KPICard theme={theme} label="Hallazgos abiertos" value={hallazgos.filter(h => h.estado === 'abierto').length} sub="pendientes de cierre" accentBg={theme.isDark ? 'rgba(251,191,36,0.18)' : '#FCEDC9'} icon="flag" />
        <KPICard theme={theme} label="Hallazgos críticos" value={hallazgos.filter(h => h.severidad === 'critica' && h.estado === 'abierto').length} sub="acción urgente" accentBg={theme.isDark ? 'rgba(248,113,113,0.18)' : '#FAD9D5'} icon="alert" />
        <KPICard theme={theme} label="Próx. auditoría ext." value="140d" sub="15-Sep-2026 · BSI" icon="calendar" />
      </div>

      <Card theme={theme} padding={0}>
        <div style={{ padding: 14, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tabs theme={theme} value={tab} onChange={setTab} items={[
            { id: 'auditorias', label: 'Auditorías', icon: 'clipboard', count: auditorias.length },
            { id: 'hallazgos', label: 'Hallazgos', icon: 'flag', count: hallazgos.length },
          ]} />
          {tab === 'hallazgos' && (
            <>
              <div style={{ flex: 1 }} />
              <select style={{ height: 30, padding: '0 10px', borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff', color: theme.ink, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                value={selectedAud || ''}
                onChange={e => setSelectedAud(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Todas las auditorías</option>
                {auditorias.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
              </select>
            </>
          )}
        </div>

        {/* ── AUDITORÍAS ──────────────────────────────────────────── */}
        {tab === 'auditorias' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 0 }}>
            <div>
              {auditorias.map((a, i) => {
                const nHal = hallazgos.filter(h => h.auditoria_id === a.id).length;
                return (
                  <div key={a.id} style={{ padding: 16, borderTop: i ? `1px solid ${theme.border}` : 'none', cursor: 'pointer', transition: 'background .15s' }}
                    onClick={() => { setTab('hallazgos'); setSelectedAud(a.id); }}
                    onDoubleClick={e => { e.stopPropagation(); setEditRow(a); }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: theme.inkMuted }}>{a.codigo}</span>
                          <Badge theme={theme} tone={a.tipo === 'Externa' ? 'accent' : a.tipo === 'Tercero' ? 'info' : 'neutral'}>{a.tipo}</Badge>
                          {nHal > 0 && <Badge theme={theme} tone="warn">{nHal} hallazgos</Badge>}
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>{a.nombre}</div>
                      </div>
                      <Badge theme={theme} tone={audTone(a.estado)} dot>{audLabel(a.estado)}</Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 11.5, color: theme.inkSoft }}>
                      <div>
                        <div style={{ color: theme.inkMuted, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Alcance</div>
                        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{a.alcance}</div>
                      </div>
                      <div>
                        <div style={{ color: theme.inkMuted, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Inicio</div>
                        <div style={{ fontVariantNumeric: 'tabular-nums' }}>{a.fecha_inicio || '—'}</div>
                      </div>
                      <div>
                        <div style={{ color: theme.inkMuted, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Fin</div>
                        <div style={{ fontVariantNumeric: 'tabular-nums' }}>{a.fecha_fin || '—'}</div>
                      </div>
                      <div>
                        <div style={{ color: theme.inkMuted, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Vencimiento</div>
                        <div style={{ fontVariantNumeric: 'tabular-nums' }}>{a.fecha_vencimiento || '—'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Calendario */}
            <div style={{ borderLeft: `1px solid ${theme.border}`, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, marginBottom: 12, letterSpacing: '-0.01em' }}>Calendario 2026</div>
              <div style={{ display: 'grid', gap: 5 }}>
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => {
                  const month = i + 1;
                  const inMonth = auditorias.filter(a => a.fecha_inicio && parseInt(a.fecha_inicio.split('-')[1]) === month);
                  return (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: theme.r.md, background: inMonth.length ? (theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)') : 'transparent', border: `1px solid ${inMonth.length ? theme.border : 'transparent'}` }}>
                      <span style={{ width: 28, fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em' }}>{m}</span>
                      <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {inMonth.length ? inMonth.map(a => <Badge key={a.id} theme={theme} tone={a.tipo === 'Externa' ? 'accent' : a.tipo === 'Tercero' ? 'info' : 'neutral'} style={{ fontSize: 10 }}>{a.codigo.split('-').pop()}</Badge>) : <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── HALLAZGOS ───────────────────────────────────────────── */}
        {tab === 'hallazgos' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                {['Código', 'Auditoría', 'Título', 'Descripción', 'Severidad', 'Estado', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleHallazgos.map(h => {
                const aud = auditorias.find(a => a.id === h.auditoria_id);
                return (
                  <tr key={h.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                    onDoubleClick={() => setEditRow(h)}
                    onMouseEnter={e => e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: theme.inkMuted }}>{h.codigo}</td>
                    <td style={{ padding: '12px 14px' }}>{aud ? <Badge theme={theme} tone="neutral">{aud.codigo}</Badge> : '—'}</td>
                    <td style={{ padding: '12px 14px', color: theme.ink, fontWeight: 500, maxWidth: 220 }}>{h.titulo}</td>
                    <td style={{ padding: '12px 14px', color: theme.inkSoft, fontSize: 12, maxWidth: 320 }}>{h.descripcion}</td>
                    <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={sevTone(h.severidad)}>{sevLabel(h.severidad)}</Badge></td>
                    <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={h.estado === 'cerrado' ? 'success' : 'warn'} dot>{h.estado}</Badge></td>
                    <td style={{ padding: '12px 14px' }}>
                      <button style={{ background: 'transparent', border: 'none', color: theme.inkMuted, cursor: 'pointer', padding: 4 }}><Icon name="edit" size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal nueva auditoría */}
      <Modal open={modalKind === 'auditoria'} onClose={() => setModalKind(null)} theme={theme}
        title="Nueva auditoría" subtitle="Complete los datos de la nueva auditoría." width={640}
        footer={<><Button theme={theme} variant="ghost" onClick={() => setModalKind(null)}>Cancelar</Button><Button theme={theme} variant="primary" onClick={saveAuditoria} icon={<Icon name="check" size={13} />}>Guardar</Button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FF label="Código" hint="Asignado automáticamente"><input style={{...inputStyle, opacity:0.55, cursor:'not-allowed'}} placeholder={`AU-${new Date().getFullYear()}-${String(auditorias.filter(a=>a.codigo.includes(String(new Date().getFullYear()))).length+1).padStart(2,'0')}`} disabled readOnly /></FF>
          <FF label="Tipo"><Pills value={form.tipo} options={['Interna','Externa','Tercero']} onChange={v => setF('tipo', v)} /></FF>
          <FF label="Nombre" span={2}><input style={inputStyle} placeholder="Nombre de la auditoría" value={form.nombre||''} onChange={e => setF('nombre', e.target.value)} /></FF>
          <FF label="Alcance" span={2}><textarea style={textareaStyle} placeholder="Controles o procesos auditados" value={form.alcance||''} onChange={e => setF('alcance', e.target.value)} /></FF>
          <FF label="Fecha de inicio"><input style={inputStyle} type="date" value={form.fecha_inicio||''} onChange={e => setF('fecha_inicio', e.target.value)} /></FF>
          <FF label="Fecha de fin"><input style={inputStyle} type="date" value={form.fecha_fin||''} onChange={e => setF('fecha_fin', e.target.value)} /></FF>
          <FF label="Fecha de vencimiento del informe"><input style={inputStyle} type="date" value={form.fecha_vencimiento||''} onChange={e => setF('fecha_vencimiento', e.target.value)} /></FF>
          <FF label="Estado"><Pills value={form.estado} options={['planificada','en-curso','completada']} onChange={v => setF('estado', v)} /></FF>
        </div>
      </Modal>

      {/* Modal nuevo hallazgo */}
      <Modal open={modalKind === 'hallazgo'} onClose={() => setModalKind(null)} theme={theme}
        title="Nuevo hallazgo" subtitle="Complete los datos del nuevo hallazgo." width={640}
        footer={<><Button theme={theme} variant="ghost" onClick={() => setModalKind(null)}>Cancelar</Button><Button theme={theme} variant="primary" onClick={saveHallazgo} icon={<Icon name="check" size={13} />}>Guardar</Button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FF label="Código" hint="Asignado automáticamente"><input style={{...inputStyle, opacity:0.55, cursor:'not-allowed'}} placeholder={`HAL-${String(hallazgos.length+1).padStart(3,'0')}`} disabled readOnly /></FF>
          <FF label="Auditoría">
            <select style={inputStyle} value={form.auditoria_id||''} onChange={e => setF('auditoria_id', e.target.value)}>
              <option value="">Seleccionar…</option>
              {auditorias.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </FF>
          <FF label="Título" span={2}><input style={inputStyle} placeholder="Título del hallazgo" value={form.titulo||''} onChange={e => setF('titulo', e.target.value)} /></FF>
          <FF label="Descripción" span={2}><textarea style={textareaStyle} value={form.descripcion||''} onChange={e => setF('descripcion', e.target.value)} /></FF>
          <FF label="Severidad"><Pills value={form.severidad} options={['menor','mayor','critica']} onChange={v => setF('severidad', v)} /></FF>
          <FF label="Estado"><Pills value={form.estado} options={['abierto','cerrado']} onChange={v => setF('estado', v)} /></FF>
        </div>
      </Modal>

      {/* Double-click row edit */}
      {editRow && React.createElement(window.RowEditModal, { open: true, onClose: () => setEditRow(null), theme, item: editRow })}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ScreenNC — M4 · No Conformidades (Kanban)
// ═════════════════════════════════════════════════════════════════════
function ScreenNC({ theme, onOpenNC }) {
  const D = window.SGSI_DATA;
  const [items, setItems] = m4uS(D.noConformidades);
  const [dragId, setDragId] = m4uS(null);
  const [dragOver, setDragOver] = m4uS(null);
  const [modalOpen, setModalOpen] = m4uS(false);
  const [form, setForm] = m4uS({});
  const [editRow, setEditRow] = m4uS(null);
  const setF = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const auditorias = D.auditorias;

  const cols = [
    { id: 'identificada', label: 'Identificada',    sub: 'Detección inicial' },
    { id: 'analisis',     label: 'Análisis causa',  sub: 'Causa raíz' },
    { id: 'plan',         label: 'Plan de acción',  sub: 'Diseño de respuesta' },
    { id: 'ejecucion',    label: 'En ejecución',    sub: 'Implementando' },
    { id: 'cerrada',      label: 'Cerrada',         sub: 'Verificada' },
  ];

  const onDragStart = id  => setDragId(id);
  const onDragOver  = (e, col) => { e.preventDefault(); setDragOver(col); };
  const onDrop      = (col) => { if (dragId) setItems(items.map(i => i.id === dragId ? { ...i, estado: col } : i)); setDragId(null); setDragOver(null); };

  const inputStyle = { width: '100%', height: 36, padding: '0 12px', borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff', color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
  const textareaStyle = { ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', minHeight: 64, lineHeight: 1.5 };
  const labelStyle = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: 'block', marginBottom: 6 };
  const FF = ({ label, children, span = 1 }) => <div style={{ gridColumn: `span ${span}` }}><label style={labelStyle}>{label}</label>{children}</div>;
  const Pills = ({ value, options, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => { const a = value === o; return <button key={o} type="button" onClick={() => onChange(o)} style={{ height: 28, padding: '0 10px', borderRadius: 999, border: `1px solid ${a ? theme.accent : theme.border}`, background: a ? theme.accent : 'transparent', color: a ? '#fff' : theme.inkSoft, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer' }}>{o}</button>; })}
    </div>
  );

  const save = () => {
    setItems(arr => [...arr, {
      id: Date.now(), auditoria_id: Number(form.auditoria_id) || null,
      codigo: form.codigo || `NC-${String(arr.length + 1).padStart(3,'0')}`,
      titulo: form.titulo || '',
      descripcion: form.descripcion || '',
      causa_raiz: form.causa_raiz || '',
      accion_correctiva: form.accion_correctiva || '',
      severidad: form.severidad || 'menor',
      fecha_identificacion: form.fecha_identificacion || new Date().toISOString().slice(0,10),
      fecha_vencimiento: form.fecha_vencimiento || '',
      fecha_cierre: null,
      estado: form.estado || 'identificada',
    }]);
    setModalOpen(false); setForm({});
  };

  return (
    <>
      <SectionHeader theme={theme} title="No conformidades" subtitle="Cláusula 10.1 · Tablero kanban — arrastra para mover entre estados"
        actions={<>
          <Button theme={theme} variant="ghost" size="sm" icon={<Icon name="filter" size={13} />}>Filtros</Button>
          <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setModalOpen(true); setForm({}); }}>Nueva NC</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KPICard theme={theme} label="Total abiertas" value={items.filter(i => i.estado !== 'cerrada').length} sub={`${items.filter(i => i.estado === 'cerrada').length} cerradas`} icon="flag" />
        <KPICard theme={theme} label="Críticas" value={items.filter(i => i.severidad === 'critica' && i.estado !== 'cerrada').length} sub="acción urgente" accentBg={theme.isDark ? 'rgba(248,113,113,0.18)' : '#FAD9D5'} icon="alert" />
        <KPICard theme={theme} label="Vencen en 30d" value={items.filter(i => i.fecha_vencimiento && new Date(i.fecha_vencimiento) < new Date('2026-06-14') && i.estado !== 'cerrada').length} sub="próximas a plazo" accentBg={theme.isDark ? 'rgba(251,191,36,0.18)' : '#FCEDC9'} icon="calendar" />
        <KPICard theme={theme} label="Tiempo medio cierre" value="34d" sub="↓ desde 47d (2025)" sparkValues={[47,44,40,38,36,34]} sparkColor={theme.success} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {cols.map(col => {
          const colItems = items.filter(i => i.estado === col.id);
          return (
            <div key={col.id} onDragOver={e => onDragOver(e, col.id)} onDrop={() => onDrop(col.id)} onDragLeave={() => setDragOver(null)}
              style={{ borderRadius: theme.r.lg, background: dragOver === col.id ? `${theme.accent}10` : (theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.35)'), border: `1.5px ${dragOver === col.id ? 'dashed' : 'solid'} ${dragOver === col.id ? theme.accent : theme.border}`, padding: 10, minHeight: 480, transition: 'background .15s, border-color .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 10px' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>{col.label}</div>
                  <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 1 }}>{col.sub}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: theme.accentSoft, color: theme.accentDeep, fontVariantNumeric: 'tabular-nums' }}>{colItems.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colItems.map(it => {
                  const overdue = it.fecha_vencimiento && new Date(it.fecha_vencimiento) < new Date('2026-05-14');
                  const aud = auditorias.find(a => a.id === it.auditoria_id);
                  return (
                    <div key={it.id} draggable onDragStart={() => onDragStart(it.id)}
                      onClick={() => onOpenNC && onOpenNC(it)}
                      onDoubleClick={e => { e.stopPropagation(); setEditRow(it); }}
                      style={{ padding: 12, borderRadius: theme.r.md, background: theme.surfaceSolid, border: `1px solid ${theme.border}`, cursor: 'grab', boxShadow: dragId === it.id ? 'none' : (theme.isDark ? '0 2px 6px rgba(0,0,0,0.25)' : '0 1px 3px rgba(60,30,10,0.06)'), opacity: dragId === it.id ? 0.4 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10.5, fontFamily: 'ui-monospace, monospace', color: theme.inkMuted }}>{it.codigo}</span>
                        <Badge theme={theme} tone={sevTone(it.severidad)}>{sevLabel(it.severidad)}</Badge>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: theme.ink, lineHeight: 1.4, marginBottom: 8, letterSpacing: '-0.005em' }}>{it.titulo}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: theme.inkMuted }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>{aud ? aud.codigo : '—'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: overdue && it.estado !== 'cerrada' ? theme.danger : theme.inkMuted, fontWeight: overdue ? 600 : 400 }}>
                          <Icon name="calendar" size={10} />{it.fecha_vencimiento ? it.fecha_vencimiento.slice(5) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nueva NC */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} theme={theme}
        title="Nueva no conformidad" subtitle="Complete los datos de la nueva NC." width={720}
        footer={<><Button theme={theme} variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button theme={theme} variant="primary" onClick={save} icon={<Icon name="check" size={13} />}>Guardar</Button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FF label="Código" hint="Se asigna automáticamente"><input style={{...inputStyle, opacity:0.55, cursor:'not-allowed'}} placeholder={`NC-${String(items.length+1).padStart(3,'0')}`} disabled readOnly /></FF>
          <FF label="Auditoría origen">
            <select style={inputStyle} value={form.auditoria_id||''} onChange={e => setF('auditoria_id', e.target.value)}>
              <option value="">Seleccionar…</option>
              {auditorias.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </FF>
          <FF label="Título" span={2}><input style={inputStyle} value={form.titulo||''} onChange={e => setF('titulo', e.target.value)} /></FF>
          <FF label="Descripción" span={2}><textarea style={textareaStyle} value={form.descripcion||''} onChange={e => setF('descripcion', e.target.value)} /></FF>
          <FF label="Causa raíz" span={2}><textarea style={{ ...textareaStyle, minHeight: 56 }} value={form.causa_raiz||''} onChange={e => setF('causa_raiz', e.target.value)} /></FF>
          <FF label="Acción correctiva" span={2}><textarea style={{ ...textareaStyle, minHeight: 56 }} value={form.accion_correctiva||''} onChange={e => setF('accion_correctiva', e.target.value)} /></FF>
          <FF label="Severidad"><Pills value={form.severidad} options={['menor','mayor','critica']} onChange={v => setF('severidad', v)} /></FF>
          <FF label="Estado"><Pills value={form.estado} options={['identificada','analisis','plan','ejecucion']} onChange={v => setF('estado', v)} /></FF>
          <FF label="Fecha de identificación"><input style={inputStyle} type="date" value={form.fecha_identificacion||''} onChange={e => setF('fecha_identificacion', e.target.value)} /></FF>
          <FF label="Fecha de vencimiento"><input style={inputStyle} type="date" value={form.fecha_vencimiento||''} onChange={e => setF('fecha_vencimiento', e.target.value)} /></FF>
        </div>
      </Modal>

      {/* Double-click row edit */}
      {editRow && React.createElement(window.RowEditModal, { open: true, onClose: () => setEditRow(null), theme, item: editRow })}
    </>
  );
}

Object.assign(window, { ScreenAuditorias, ScreenNC });
