// GrowthSI — M3 · Riesgos + SoA aligned to DB schema
// Entidades: escenario_riesgo, riesgo, control_soa

const { useState: m3uS, useMemo: m3uM } = React;

// ── helpers ──────────────────────────────────────────────────────────
const tratTone = (t) => ({ mitigar: 'warn', transferir: 'info', aceptar: 'success', evitar: 'danger' })[t] || 'neutral';
const estTone  = (e) => ({ tratamiento: 'warn', controlado: 'success', aceptado: 'info' })[e] || 'neutral';

const getNivelLabel = (n, maxScore) => {
  const pct = n / maxScore;
  if (pct >= 0.6) return 'Crítico';
  if (pct >= 0.4) return 'Alto';
  if (pct >= 0.2) return 'Medio';
  return 'Bajo';
};
const getNivelTone = (n, maxScore) => {
  const pct = n / maxScore;
  if (pct >= 0.6) return 'danger';
  if (pct >= 0.4) return 'warn';
  if (pct >= 0.2) return 'info';
  return 'success';
};

// Pool de riesgos sugeridos
const RISK_POOL = [
  { nombre: 'Acceso no autorizado por credenciales comprometidas', descripcion: 'Uso de credenciales robadas para acceder a sistemas críticos del negocio.', tratamiento: 'mitigar' },
  { nombre: 'Ataque DDoS a plataformas de operación', descripcion: 'Denegación de servicio afecta disponibilidad de sistemas de transporte y logística.', tratamiento: 'mitigar' },
  { nombre: 'Ingeniería social a personal clave', descripcion: 'Empleados comprometidos mediante phishing, vishing o impersonation.', tratamiento: 'mitigar' },
  { nombre: 'Vulnerabilidades en APIs de integración', descripcion: 'Endpoints sin autenticación robusta exponen datos transaccionales entre sistemas.', tratamiento: 'mitigar' },
  { nombre: 'Pérdida de dispositivos móviles corporativos', descripcion: 'Smartphones o tablets con datos sensibles sin cifrado ni borrado remoto configurado.', tratamiento: 'mitigar' },
  { nombre: 'Acceso indebido de proveedor TI externo', descripcion: 'Tercero con acceso remoto excede permisos asignados o actúa de forma maliciosa.', tratamiento: 'mitigar' },
  { nombre: 'Fallo de data center principal', descripcion: 'Indisponibilidad del data center afecta sistemas críticos sin redundancia activa.', tratamiento: 'transferir' },
  { nombre: 'Divulgación accidental por correo electrónico', descripcion: 'Empleado envía información confidencial a destinatario incorrecto por error o descuido.', tratamiento: 'mitigar' },
  { nombre: 'Malware en red operativa (OT/flota)', descripcion: 'Software malicioso afecta sistemas de gestión de flota o almacenes.', tratamiento: 'mitigar' },
  { nombre: 'Incumplimiento de SLA por proveedor de datos', descripcion: 'Proveedor incumple obligaciones de confidencialidad causando exposición de datos.', tratamiento: 'transferir' },
];

// Pool de controles sugeridos
const CONTROL_POOL = [
  { control_id: 'A.5.15', nombre: 'Control de acceso',                  tema: 'A.5', desc: 'Política RBAC y revisión periódica de privilegios con MFA obligatorio.' },
  { control_id: 'A.8.7',  nombre: 'Protección contra malware',           tema: 'A.8', desc: 'EDR/antivirus en todos los endpoints y servidores con actualizaciones automáticas.' },
  { control_id: 'A.8.8',  nombre: 'Gestión de vulnerabilidades técnicas', tema: 'A.8', desc: 'Escaneo periódico y parcheo regular de sistemas en producción.' },
  { control_id: 'A.8.13', nombre: 'Copia de seguridad',                  tema: 'A.8', desc: 'Backups regulares con pruebas de restauración documentadas.' },
  { control_id: 'A.8.5',  nombre: 'Autenticación segura',                tema: 'A.8', desc: 'MFA y política de contraseñas robustas en todos los sistemas.' },
  { control_id: 'A.6.3',  nombre: 'Concienciación y formación en SI',    tema: 'A.6', desc: 'Capacitación periódica y simulaciones de phishing mensuales.' },
  { control_id: 'A.8.12', nombre: 'Prevención de fuga de datos (DLP)',   tema: 'A.8', desc: 'Controles DLP en correo, endpoints y almacenamiento en la nube.' },
  { control_id: 'A.5.30', nombre: 'Preparación TIC para continuidad',    tema: 'A.5', desc: 'BCP documentado y probado con RTO/RPO definidos.' },
  { control_id: 'A.8.23', nombre: 'Filtrado web',                        tema: 'A.8', desc: 'Proxy/DNS filtering para URLs maliciosas o no autorizadas.' },
  { control_id: 'A.8.24', nombre: 'Uso de criptografía',                 tema: 'A.8', desc: 'Cifrado AES-256 en reposo y TLS 1.3 en tránsito.' },
  { control_id: 'A.7.4',  nombre: 'Monitorización de seguridad física',  tema: 'A.7', desc: 'CCTV 24/7 y control biométrico en áreas sensibles.' },
  { control_id: 'A.8.9',  nombre: 'Gestión de configuración',            tema: 'A.8', desc: 'Baselines CIS aplicados y gestionados mediante herramienta centralizada.' },
];

// ═════════════════════════════════════════════════════════════════════
// ScreenRiesgos
// ═════════════════════════════════════════════════════════════════════
function ScreenRiesgos({ theme, onOpenRisk }) {
  const D = window.SGSI_DATA;
  const [tab, setTab]               = m3uS('escenarios');
  const [escenarios, setEscenarios] = m3uS(D.escenarios_riesgo);
  const [riesgos, setRiesgos]       = m3uS(D.riesgos);
  const [modalKind, setModalKind]   = m3uS(null);
  const [form, setForm]             = m3uS({});
  const [criteria, setCriteria]         = m3uS({ maxProb: 5, maxImpact: 5 });
  const [criteriaModal, setCriteriaModal] = m3uS(false);
  const [critDraft, setCritDraft]       = m3uS({ maxProb: 5, maxImpact: 5 });
  const [suggestModal, setSuggestModal]       = m3uS(false);
  const [selectedRisks, setSelectedRisks]     = m3uS([]);
  const [editRow, setEditRow]               = m3uS(null);

  const setF = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const maxScore = criteria.maxProb * criteria.maxImpact;
  const nivelLabel = (n) => getNivelLabel(n, maxScore);
  const nivelTone  = (n) => getNivelTone(n, maxScore);

  // ── Stats ─────────────────────────────────────────────────────────
  const criticos    = riesgos.filter(r => getNivelTone(r.nivel_actual, maxScore) === 'danger').length;
  const residualAvg = riesgos.length ? (riesgos.reduce((s, r) => s + r.nivel_actual, 0) / riesgos.length).toFixed(1) : 0;

  // ── Matriz dinámica ───────────────────────────────────────────────
  const maxP = criteria.maxProb;
  const maxI = criteria.maxImpact;
  const matrix = m3uM(() => {
    const m = Array.from({ length: maxI }, () => Array.from({ length: maxP }, () => []));
    riesgos.forEach(r => {
      const prob = Math.min(Math.max(r.probabilidad_actual, 1), maxP);
      const imp  = Math.min(Math.max(r.impacto_actual, 1), maxI);
      const ri   = maxI - imp;
      const ci   = prob - 1;
      if (ri >= 0 && ri < maxI && ci >= 0 && ci < maxP) m[ri][ci].push(r);
    });
    return m;
  }, [riesgos, maxP, maxI]);

  const cellColor = (probIdx, impIdx) => {
    const score = (probIdx + 1) * (maxI - impIdx);
    const ms = maxP * maxI;
    const pct = score / ms;
    if (pct >= 0.6) return { bg: theme.isDark ? 'rgba(248,113,113,0.22)' : '#FBC9C0', text: theme.danger };
    if (pct >= 0.4) return { bg: theme.isDark ? 'rgba(251,191,36,0.22)'  : '#FCE0BB', text: theme.warn };
    if (pct >= 0.2) return { bg: theme.isDark ? 'rgba(96,165,250,0.18)'  : '#FCEDC9', text: theme.warn };
    return { bg: theme.isDark ? 'rgba(52,211,153,0.18)' : '#D6F2E5', text: theme.success };
  };

  // ── Estilos compartidos ───────────────────────────────────────────
  const inputStyle = { width: '100%', height: 36, padding: '0 12px', borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff', color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
  const textareaStyle = { ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', minHeight: 64, lineHeight: 1.5 };
  const labelStyle = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: 'block', marginBottom: 6 };
  const FF = ({ label, children, span = 1, hint }) => (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
  const Pills = ({ value, options, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => { const a = value === o; return <button key={o} type="button" onClick={() => onChange(o)} style={{ height: 28, padding: '0 10px', borderRadius: 999, border: `1px solid ${a ? theme.accent : theme.border}`, background: a ? theme.accent : 'transparent', color: a ? '#fff' : theme.inkSoft, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer' }}>{o}</button>; })}
    </div>
  );

  // ── Save handlers ─────────────────────────────────────────────────
  const saveEscenario = () => {
    setEscenarios(arr => [...arr, {
      id: Date.now(), organizacion_id: 1,
      codigo: `ESC-${String(arr.length + 1).padStart(3, '0')}`,
      nombre: form.nombre || '', descripcion: form.descripcion || '',
      amenaza: form.amenaza || '', vulnerabilidad: form.vulnerabilidad || '',
      estado: form.estado || 'activo',
    }]);
    setModalKind(null); setForm({});
  };

  const saveRiesgo = () => {
    const pi = Number(form.probabilidad_inicial) || 1;
    const ii = Number(form.impacto_inicial) || 1;
    const pa = Number(form.probabilidad_actual) || pi;
    const ia = Number(form.impacto_actual) || ii;
    setRiesgos(arr => [...arr, {
      id: Date.now(), escenario_riesgo_id: Number(form.escenario_riesgo_id) || null,
      codigo: `R-${String(arr.length + 1).padStart(3, '0')}`,
      nombre: form.nombre || '', descripcion: form.descripcion || '',
      probabilidad_inicial: pi, impacto_inicial: ii, nivel_inicial: pi * ii,
      tratamiento: form.tratamiento || 'mitigar',
      probabilidad_actual: pa, impacto_actual: ia, nivel_actual: pa * ia,
      estado: form.estado || 'tratamiento',
    }]);
    setModalKind(null); setForm({});
  };

  // Añadir riesgos sugeridos seleccionados
  const addSuggestedRisks = () => {
    const toAdd = RISK_POOL.filter((_, i) => selectedRisks.includes(i));
    setRiesgos(arr => [
      ...arr,
      ...toAdd.map((r, i) => ({
        id: Date.now() + i, organizacion_id: 1, escenario_riesgo_id: null,
        codigo: `R-${String(arr.length + i + 1).padStart(3, '0')}`,
        nombre: r.nombre, descripcion: r.descripcion,
        probabilidad_inicial: 3, impacto_inicial: 3, nivel_inicial: 9,
        tratamiento: r.tratamiento,
        probabilidad_actual: 3, impacto_actual: 3, nivel_actual: 9,
        estado: 'tratamiento',
      })),
    ]);
    setSuggestModal(false); setSelectedRisks([]);
  };

  const toggleSuggest = (i) => setSelectedRisks(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <SectionHeader theme={theme} title="Gestión de riesgos" subtitle="Cláusula 6.1 · Escenarios, identificación, análisis y tratamiento de riesgos"
        actions={<>
          <Button theme={theme} variant="ghost" size="sm" icon={<Icon name="settings" size={13} />} onClick={() => { setCritDraft({ ...criteria }); setCriteriaModal(true); }}>Criterios de riesgo</Button>
          {tab === 'escenarios' && <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setModalKind('escenario'); setForm({}); }}>Nuevo escenario</Button>}
          {(tab === 'lista' || tab === 'matriz') && <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setModalKind('riesgo'); setForm({}); }}>Nuevo riesgo</Button>}
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KPICard theme={theme} label="Escenarios" value={escenarios.length} sub="identificados" icon="layers" />
        <KPICard theme={theme} label="Riesgos" value={riesgos.length} sub="total registrados" icon="alert" />
        <KPICard theme={theme} label="Nivel crítico" value={criticos} sub="nivel ≥60% del máximo" accentBg={theme.isDark ? 'rgba(248,113,113,0.18)' : '#FAD9D5'} icon="flag" />
        <KPICard theme={theme} label="Nivel residual prom." value={residualAvg} sub={`escala máx. ${maxScore}`} sparkValues={[8.1,7.8,7.4,7.0,6.7,Number(residualAvg)]} sparkColor={theme.success} />
      </div>

      <Card theme={theme} padding={0}>
        <div style={{ padding: 14, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tabs theme={theme} value={tab} onChange={setTab} items={[
            { id: 'escenarios', label: 'Escenarios de riesgo', icon: 'layers', count: escenarios.length },
            { id: 'lista', label: 'Riesgos', icon: 'menu', count: riesgos.length },
            { id: 'matriz', label: `Matriz ${maxP}×${maxI}`, icon: 'grid' },
          ]} />
          {tab === 'lista' && (
            <>
              <div style={{ flex: 1 }} />
              <AIButton theme={theme} label="Sugerir riesgos" size="sm" onClick={() => { setSuggestModal(true); setSelectedRisks([]); }} />
            </>
          )}
        </div>

        {/* ══ ESCENARIOS ══════════════════════════════════════════════ */}
        {tab === 'escenarios' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                {['Código', 'Nombre', 'Amenaza', 'Vulnerabilidad', 'Riesgos', 'Estado', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {escenarios.map(esc => {
                const linked = riesgos.filter(r => r.escenario_riesgo_id === esc.id);
                return (
                  <tr key={esc.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                    onDoubleClick={e => { e.stopPropagation(); setEditRow(esc); }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: theme.inkMuted }}>{esc.codigo}</td>
                    <td style={{ padding: '12px 14px', color: theme.ink, fontWeight: 500, maxWidth: 260 }}>{esc.nombre}</td>
                    <td style={{ padding: '12px 14px', color: theme.inkSoft, maxWidth: 200, fontSize: 12 }}>{esc.amenaza}</td>
                    <td style={{ padding: '12px 14px', color: theme.inkSoft, maxWidth: 240, fontSize: 12 }}>{esc.vulnerabilidad}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {linked.length === 0
                          ? <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>
                          : linked.map(r => <Badge key={r.id} theme={theme} tone={nivelTone(r.nivel_actual)}>{r.codigo}</Badge>)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={esc.estado === 'activo' ? 'success' : 'neutral'} dot>{esc.estado}</Badge></td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={e => e.stopPropagation()} style={{ background: 'transparent', border: 'none', color: theme.inkMuted, cursor: 'pointer', padding: 4 }}><Icon name="edit" size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ══ LISTA DE RIESGOS ════════════════════════════════════════ */}
        {tab === 'lista' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                {['Código', 'Riesgo', 'Escenario', 'P·I inicial', 'Nivel inicial', 'P·I actual', 'Nivel actual', 'Tratamiento', 'Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riesgos.map(r => {
                const esc = escenarios.find(e => e.id === r.escenario_riesgo_id);
                return (
                  <tr key={r.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                    onClick={() => onOpenRisk && onOpenRisk(r)}
                    onDoubleClick={e => { e.stopPropagation(); setEditRow(r); }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: theme.inkMuted }}>{r.codigo}</td>
                    <td style={{ padding: '11px 12px', color: theme.ink, fontWeight: 500, maxWidth: 240 }}>{r.nombre}</td>
                    <td style={{ padding: '11px 12px', color: theme.inkSoft, fontSize: 11.5 }}>{esc ? <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{esc.codigo}</span> : '—'}</td>
                    <td style={{ padding: '11px 12px', color: theme.inkSoft, fontFamily: 'ui-monospace, monospace', fontSize: 11.5, textAlign: 'center' }}>{r.probabilidad_inicial}·{r.impacto_inicial}</td>
                    <td style={{ padding: '11px 12px' }}><Badge theme={theme} tone={nivelTone(r.nivel_inicial)}>{nivelLabel(r.nivel_inicial)} · {r.nivel_inicial}</Badge></td>
                    <td style={{ padding: '11px 12px', color: theme.inkSoft, fontFamily: 'ui-monospace, monospace', fontSize: 11.5, textAlign: 'center' }}>{r.probabilidad_actual}·{r.impacto_actual}</td>
                    <td style={{ padding: '11px 12px' }}><Badge theme={theme} tone={nivelTone(r.nivel_actual)}>{nivelLabel(r.nivel_actual)} · {r.nivel_actual}</Badge></td>
                    <td style={{ padding: '11px 12px' }}><Badge theme={theme} tone={tratTone(r.tratamiento)}>{r.tratamiento}</Badge></td>
                    <td style={{ padding: '11px 12px' }}><Badge theme={theme} tone={estTone(r.estado)} dot>{r.estado}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ══ MATRIZ DINÁMICA ═════════════════════════════════════════ */}
        {tab === 'matriz' && (
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
                Probabilidad (1–{maxP}) →
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, color: theme.inkMuted, fontWeight: 600, letterSpacing: '0.05em', paddingRight: 4 }}>Impacto (1–{maxI}) →</div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `auto repeat(${maxP}, 1fr)`, gap: 4 }}>
                  {Array.from({ length: maxI }, (_, rowIdx) => {
                    const impVal = maxI - rowIdx;
                    return (
                      <React.Fragment key={impVal}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontSize: 10.5, fontWeight: 600, color: theme.inkMuted }}>{impVal}</div>
                        {Array.from({ length: maxP }, (_, colIdx) => {
                          const bucket = matrix[rowIdx][colIdx];
                          const c = cellColor(colIdx, rowIdx);
                          const cellH = maxP > 7 ? 48 : 58;
                          return (
                            <div key={colIdx} style={{ minHeight: cellH, background: c.bg, borderRadius: theme.r.md, border: `1px solid ${theme.border}`, padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {bucket.slice(0, maxP > 7 ? 1 : 2).map(b => (
                                <div key={b.id} onClick={() => onOpenRisk && onOpenRisk(b)} style={{ fontSize: maxP > 7 ? 8.5 : 9.5, fontWeight: 600, padding: '2px 4px', borderRadius: 3, background: theme.surfaceSolid, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{b.codigo}</div>
                              ))}
                              {bucket.length > (maxP > 7 ? 1 : 2) && <div style={{ fontSize: 8.5, color: c.text, fontWeight: 600 }}>+{bucket.length - (maxP > 7 ? 1 : 2)}</div>}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  <div />
                  {Array.from({ length: maxP }, (_, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, paddingTop: 4 }}>{i + 1}</div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10, fontSize: 10.5, color: theme.inkMuted }}>
                {[
                  { l: `Bajo (0-${Math.floor(maxScore*0.2)})`,  ci: 0, ri: maxI-1 },
                  { l: `Medio (${Math.floor(maxScore*0.2)+1}-${Math.floor(maxScore*0.4)})`, ci: Math.floor(maxP/3), ri: Math.floor(maxI/2) },
                  { l: `Alto (${Math.floor(maxScore*0.4)+1}-${Math.floor(maxScore*0.6)})`,  ci: Math.floor(maxP*0.6), ri: 1 },
                  { l: `Crítico (${Math.floor(maxScore*0.6)+1}-${maxScore})`, ci: maxP-1, ri: 0 },
                ].map(x => (
                  <span key={x.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: cellColor(x.ci, x.ri).bg, border: `1px solid ${theme.border}` }} />{x.l}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink, marginBottom: 10 }}>Top riesgos por nivel actual</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...riesgos].sort((a, b) => b.nivel_actual - a.nivel_actual).slice(0, 6).map(r => (
                  <div key={r.id} onClick={() => onOpenRisk && onOpenRisk(r)} style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, color: theme.inkMuted, fontFamily: 'ui-monospace, monospace', marginBottom: 2 }}>{r.codigo}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: theme.ink }}>{r.nombre}</div>
                      </div>
                      <Badge theme={theme} tone={nivelTone(r.nivel_actual)}>{r.nivel_actual}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ══ Modal: Criterios de riesgo ══════════════════════════════ */}
      <Modal open={criteriaModal} onClose={() => setCriteriaModal(false)} theme={theme}
        title="Criterios de evaluación de riesgos" subtitle="Define las escalas de probabilidad e impacto. Esto ajusta el tamaño de la matriz."
        width={520}
        footer={<>
          <Button theme={theme} variant="ghost" onClick={() => setCriteriaModal(false)}>Cancelar</Button>
          <Button theme={theme} variant="primary" icon={<Icon name="check" size={13} />} onClick={() => { setCriteria({ ...critDraft }); setCriteriaModal(false); }}>Aplicar criterios</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Probabilidad */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Escala de Probabilidad</div>
                <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>Rango: 1 a {critDraft.maxProb}</div>
              </div>
              <div style={{
                minWidth: 40, height: 40, borderRadius: theme.r.md,
                background: theme.accentSoft, color: theme.accentDeep,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
              }}>{critDraft.maxProb}</div>
            </div>
            <input type="range" min="3" max="10" value={critDraft.maxProb}
              onChange={e => setCritDraft(s => ({ ...s, maxProb: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: theme.accent }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: theme.inkMuted, marginTop: 4 }}>
              <span>3 (mínimo)</span><span>10 (máximo)</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {[3, 5, 7, 10].map(v => (
                <button key={v} onClick={() => setCritDraft(s => ({ ...s, maxProb: v }))} style={{
                  height: 28, padding: '0 12px', borderRadius: 999, fontSize: 12,
                  border: `1px solid ${critDraft.maxProb === v ? theme.accent : theme.border}`,
                  background: critDraft.maxProb === v ? theme.accent : 'transparent',
                  color: critDraft.maxProb === v ? '#fff' : theme.inkSoft,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
          </div>

          {/* Impacto */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Escala de Impacto</div>
                <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>Rango: 1 a {critDraft.maxImpact}</div>
              </div>
              <div style={{
                minWidth: 40, height: 40, borderRadius: theme.r.md,
                background: theme.accentSoft, color: theme.accentDeep,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
              }}>{critDraft.maxImpact}</div>
            </div>
            <input type="range" min="3" max="10" value={critDraft.maxImpact}
              onChange={e => setCritDraft(s => ({ ...s, maxImpact: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: theme.accent }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: theme.inkMuted, marginTop: 4 }}>
              <span>3 (mínimo)</span><span>10 (máximo)</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {[3, 5, 7, 10].map(v => (
                <button key={v} onClick={() => setCritDraft(s => ({ ...s, maxImpact: v }))} style={{
                  height: 28, padding: '0 12px', borderRadius: 999, fontSize: 12,
                  border: `1px solid ${critDraft.maxImpact === v ? theme.accent : theme.border}`,
                  background: critDraft.maxImpact === v ? theme.accent : 'transparent',
                  color: critDraft.maxImpact === v ? '#fff' : theme.inkSoft,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ padding: 12, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon name="grid" size={18} color={theme.accent} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink }}>Matriz resultante: {critDraft.maxProb}×{critDraft.maxImpact}</div>
              <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>Puntaje máximo: {critDraft.maxProb * critDraft.maxImpact} · Umbral crítico: ≥{Math.ceil(critDraft.maxProb * critDraft.maxImpact * 0.6)}</div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ Modal: Nuevo escenario ══════════════════════════════════ */}
      <Modal open={modalKind === 'escenario'} onClose={() => setModalKind(null)} theme={theme}
        title="Nuevo escenario de riesgo" subtitle="Complete los datos del nuevo escenario." width={640}
        footer={<><Button theme={theme} variant="ghost" onClick={() => setModalKind(null)}>Cancelar</Button><Button theme={theme} variant="primary" onClick={saveEscenario} icon={<Icon name="check" size={13} />}>Guardar</Button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FF label="Código" hint="Asignado automáticamente">
            <input style={{ ...inputStyle, opacity: 0.55, cursor: 'not-allowed' }} placeholder={`ESC-${String(escenarios.length + 1).padStart(3,'0')}`} disabled readOnly />
          </FF>
          <FF label="Estado"><Pills value={form.estado} options={['activo','inactivo']} onChange={v => setF('estado', v)} /></FF>
          <FF label="Nombre" span={2}><input style={inputStyle} placeholder="Nombre del escenario" value={form.nombre||''} onChange={e => setF('nombre', e.target.value)} /></FF>
          <FF label="Amenaza" span={2}><input style={inputStyle} placeholder="Tipo de amenaza principal" value={form.amenaza||''} onChange={e => setF('amenaza', e.target.value)} /></FF>
          <FF label="Vulnerabilidad" span={2}><input style={inputStyle} placeholder="Vulnerabilidad explotada" value={form.vulnerabilidad||''} onChange={e => setF('vulnerabilidad', e.target.value)} /></FF>
          <FF label="Descripción" span={2}><textarea style={textareaStyle} value={form.descripcion||''} onChange={e => setF('descripcion', e.target.value)} /></FF>
        </div>
      </Modal>

      {/* ══ Modal: Nuevo riesgo ══════════════════════════════════════ */}
      <Modal open={modalKind === 'riesgo'} onClose={() => setModalKind(null)} theme={theme}
        title="Nuevo riesgo" subtitle="Complete los datos del nuevo riesgo." width={680}
        footer={<><Button theme={theme} variant="ghost" onClick={() => setModalKind(null)}>Cancelar</Button><Button theme={theme} variant="primary" onClick={saveRiesgo} icon={<Icon name="check" size={13} />}>Guardar</Button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FF label="Código" hint="Asignado automáticamente">
            <input style={{ ...inputStyle, opacity: 0.55, cursor: 'not-allowed' }} placeholder={`R-${String(riesgos.length + 1).padStart(3,'0')}`} disabled readOnly />
          </FF>
          <FF label="Escenario padre">
            <select style={inputStyle} value={form.escenario_riesgo_id||''} onChange={e => setF('escenario_riesgo_id', e.target.value)}>
              <option value="">Sin escenario</option>
              {escenarios.map(esc => <option key={esc.id} value={esc.id}>{esc.codigo} — {esc.nombre}</option>)}
            </select>
          </FF>
          <FF label="Nombre" span={2}><input style={inputStyle} placeholder="Nombre del riesgo" value={form.nombre||''} onChange={e => setF('nombre', e.target.value)} /></FF>
          <FF label="Descripción" span={2}><textarea style={textareaStyle} placeholder="Describe el riesgo y su posible materialización…" value={form.descripcion||''} onChange={e => setF('descripcion', e.target.value)} /></FF>
          <FF label={`Probabilidad inicial (1-${maxP})`}><input style={inputStyle} type="number" min="1" max={maxP} value={form.probabilidad_inicial||''} onChange={e => setF('probabilidad_inicial', e.target.value)} /></FF>
          <FF label={`Impacto inicial (1-${maxI})`}><input style={inputStyle} type="number" min="1" max={maxI} value={form.impacto_inicial||''} onChange={e => setF('impacto_inicial', e.target.value)} /></FF>
          <FF label={`Probabilidad actual (1-${maxP})`}><input style={inputStyle} type="number" min="1" max={maxP} value={form.probabilidad_actual||''} onChange={e => setF('probabilidad_actual', e.target.value)} /></FF>
          <FF label={`Impacto actual (1-${maxI})`}><input style={inputStyle} type="number" min="1" max={maxI} value={form.impacto_actual||''} onChange={e => setF('impacto_actual', e.target.value)} /></FF>
          <FF label="Tratamiento"><Pills value={form.tratamiento} options={['mitigar','transferir','aceptar','evitar']} onChange={v => setF('tratamiento', v)} /></FF>
          <FF label="Estado"><Pills value={form.estado} options={['tratamiento','controlado','aceptado']} onChange={v => setF('estado', v)} /></FF>
        </div>
      </Modal>

      {/* ══ Modal: Sugerir riesgos ══════════════════════════════════ */}
      <Modal open={suggestModal} onClose={() => setSuggestModal(false)} theme={theme}
        title="Sugerir riesgos" subtitle="Selecciona uno o varios riesgos para añadir al registro."
        width={680}
        footer={<>
          <Button theme={theme} variant="ghost" onClick={() => { setSuggestModal(false); setSelectedRisks([]); }}>Cancelar</Button>
          <Button theme={theme} variant="primary" disabled={selectedRisks.length === 0} icon={<Icon name="plus" size={13} />} onClick={addSuggestedRisks}>
            Agregar {selectedRisks.length > 0 ? `(${selectedRisks.length})` : ''} seleccionados
          </Button>
        </>}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={16} color={theme.accent} />
          </div>
          <div style={{ fontSize: 12, color: theme.inkSoft, lineHeight: 1.5 }}>
            Riesgos frecuentes en organizaciones del sector logístico y de servicios, alineados a ISO 27001:2022.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RISK_POOL.map((r, i) => {
            const sel = selectedRisks.includes(i);
            // Skip if already exists in riesgos list
            const exists = riesgos.some(x => x.nombre === r.nombre);
            return (
              <label key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: 12, borderRadius: theme.r.md, cursor: exists ? 'not-allowed' : 'pointer',
                background: sel ? `${theme.accent}10` : (theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)'),
                border: `1px solid ${sel ? theme.accent : theme.border}`,
                opacity: exists ? 0.45 : 1,
                transition: 'all .12s',
              }}>
                <input type="checkbox" checked={sel} disabled={exists} onChange={() => !exists && toggleSuggest(i)}
                  style={{ marginTop: 2, accentColor: theme.accent, width: 15, height: 15, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>{r.nombre}</span>
                    {exists && <Badge theme={theme} tone="neutral">Ya registrado</Badge>}
                    <Badge theme={theme} tone={tratTone(r.tratamiento)} style={{ marginLeft: 'auto' }}>{r.tratamiento}</Badge>
                  </div>
                  <div style={{ fontSize: 11.5, color: theme.inkSoft, lineHeight: 1.45 }}>{r.descripcion}</div>
                </div>
              </label>
            );
          })}
        </div>
      </Modal>

      {/* Double-click row edit */}
      {editRow && React.createElement(window.RowEditModal, { open: true, onClose: () => setEditRow(null), theme, item: editRow })}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ScreenSoA — M3 · Declaración de Aplicabilidad
// ═════════════════════════════════════════════════════════════════════
function ScreenSoA({ theme, onOpenControl }) {
  const D = window.SGSI_DATA;
  const [themeFilter, setThemeFilter] = m3uS('all');
  const [editId, setEditId]           = m3uS(null);
  const [soaState, setSoaState]       = m3uS(() =>
    D.annexA.controls.map(c => ({
      id: c.id, control: c, aplica: c.applies, estado: c.status,
      justificacion: c.justification, evidencia: '', observaciones: '',
      fecha_revision: '2026-04-28', responsable: c.owner,
    }))
  );

  const themes_ = D.annexA.themes;
  const filtered = themeFilter === 'all' ? soaState : soaState.filter(s => s.control.theme === themeFilter);
  const stats = {
    total: soaState.length,
    aplica: soaState.filter(s => s.aplica).length,
    impl:   soaState.filter(s => s.estado === 'implementado').length,
    parcial:soaState.filter(s => s.estado === 'parcial').length,
    plan:   soaState.filter(s => s.estado === 'planificado').length,
    noApl:  soaState.filter(s => s.estado === 'no-aplica').length,
  };
  const statusTone  = { implementado: 'success', parcial: 'warn', planificado: 'info', 'no-aplica': 'neutral' };
  const statusLabel = { implementado: 'Implementado', parcial: 'Parcial', planificado: 'Planificado', 'no-aplica': 'No aplica' };
  const updateSoa   = (id, patch) => setSoaState(arr => arr.map(s => s.id === id ? { ...s, ...patch } : s));
  const editItem    = soaState.find(s => s.id === editId);

  const inputStyle = { width: '100%', height: 34, padding: '0 10px', borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff', color: theme.ink, fontSize: 12.5, fontFamily: 'inherit', outline: 'none' };
  const textareaStyle = { ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical', minHeight: 60, lineHeight: 1.5 };

  return (
    <>
      <SectionHeader theme={theme} title="Declaración de Aplicabilidad (SoA)" subtitle="Cláusula 6.1.3.d · 93 controles Anexo A ISO/IEC 27001:2022"
        actions={<Button theme={theme} variant="ghost" size="sm" icon={<Icon name="download" size={13} />}>Exportar SoA</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {themes_.map(t => {
          const tItems = soaState.filter(s => s.control.theme === t.id);
          const tImpl  = tItems.filter(s => s.estado === 'implementado').length;
          const pct    = Math.round((tImpl / Math.max(1, tItems.length)) * 100);
          return (
            <Card key={t.id} theme={theme} hover onClick={() => setThemeFilter(t.id === themeFilter ? 'all' : t.id)}
              style={{ cursor: 'pointer', borderColor: themeFilter === t.id ? theme.accent : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, fontFamily: 'ui-monospace, monospace' }}>{t.id}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.ink, marginTop: 2 }}>{t.name}</div>
                </div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.accentDeep }}>{t.count}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: theme.inkMuted }}>Implementación</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              </div>
              <div style={{ height: 5, background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 999 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: theme.accent, borderRadius: 999 }} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card theme={theme} padding={14} style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {[{ l: 'Total', v: stats.total, c: theme.ink }, { l: 'Aplican', v: stats.aplica, c: theme.accent }, { l: 'Implementados', v: stats.impl, c: theme.success }, { l: 'Parciales', v: stats.parcial, c: theme.warn }, { l: 'Planificados', v: stats.plan, c: theme.info }, { l: 'No aplica', v: stats.noApl, c: theme.inkMuted }].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: theme.inkMuted, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </Card>

      <Card theme={theme} padding={0}>
        <div style={{ padding: 14, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tabs theme={theme} value={themeFilter} onChange={setThemeFilter} items={[
            { id: 'all', label: 'Todos', count: soaState.length },
            ...themes_.map(t => ({ id: t.id, label: t.id, count: soaState.filter(s => s.control.theme === t.id).length })),
          ]} />
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                {['Control', 'Nombre', 'Aplica', 'Estado', 'Justificación', 'Evidencia', 'F. Revisión', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                  onDoubleClick={() => setEditId(s.id)}
                  onMouseEnter={e => e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: theme.accentDeep, fontWeight: 600 }}>{s.control.id}</td>
                  <td style={{ padding: '11px 12px', color: theme.ink, fontWeight: 500, maxWidth: 260 }}>{s.control.name}</td>
                  <td style={{ padding: '11px 12px' }}><Badge theme={theme} tone={s.aplica ? 'success' : 'neutral'} dot>{s.aplica ? 'Sí' : 'No'}</Badge></td>
                  <td style={{ padding: '11px 12px' }}><Badge theme={theme} tone={statusTone[s.estado]}>{statusLabel[s.estado]}</Badge></td>
                  <td style={{ padding: '11px 12px', color: theme.inkSoft, fontSize: 12, maxWidth: 280 }}>{s.justificacion}</td>
                  <td style={{ padding: '11px 12px' }}>{s.evidencia ? <Badge theme={theme} tone="success" dot>Con evidencia</Badge> : <Badge theme={theme} tone="neutral">Sin evidencia</Badge>}</td>
                  <td style={{ padding: '11px 12px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>{s.fecha_revision}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <button onClick={() => setEditId(s.id)} style={{ background: 'transparent', border: 'none', color: theme.inkMuted, cursor: 'pointer', padding: 4 }}><Icon name="edit" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editItem && (
        <SidePanel open={!!editId} onClose={() => setEditId(null)} theme={theme}
          title={editItem.control.id} subtitle={editItem.control.name}
          footer={<><Button theme={theme} variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancelar</Button><Button theme={theme} variant="primary" size="sm" icon={<Icon name="check" size={13} />} onClick={() => setEditId(null)}>Guardar</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Aplica</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Sí','No'].map(o => { const a = editItem.aplica === (o==='Sí'); return <button key={o} onClick={() => updateSoa(editId,{aplica: o==='Sí'})} style={{ height: 30, padding: '0 14px', borderRadius: 999, border: `1px solid ${a ? theme.accent : theme.border}`, background: a ? theme.accent : 'transparent', color: a ? '#fff' : theme.inkSoft, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>{o}</button>; })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Estado</label>
              <select style={inputStyle} value={editItem.estado} onChange={e => updateSoa(editId,{estado: e.target.value})}>
                <option value="implementado">Implementado</option>
                <option value="parcial">Parcial</option>
                <option value="planificado">Planificado</option>
                <option value="no-aplica">No aplica</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Justificación</label>
              <textarea style={textareaStyle} value={editItem.justificacion} onChange={e => updateSoa(editId,{justificacion: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Evidencia (URL)</label>
              <input style={inputStyle} value={editItem.evidencia} onChange={e => updateSoa(editId,{evidencia: e.target.value})} placeholder="https://sharepoint.../evidencia" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Observaciones</label>
              <textarea style={textareaStyle} value={editItem.observaciones} onChange={e => updateSoa(editId,{observaciones: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Fecha de revisión</label>
              <input style={{ ...inputStyle, width: 'auto' }} type="date" value={editItem.fecha_revision} onChange={e => updateSoa(editId,{fecha_revision: e.target.value})} />
            </div>
          </div>
        </SidePanel>
      )}
    </>
  );
}

// Export CONTROL_POOL for use in app.jsx DetailPanel
window.CONTROL_POOL_M3 = CONTROL_POOL;

Object.assign(window, { ScreenRiesgos, ScreenSoA });
