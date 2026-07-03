// SGSI Platform — Screens part 2
// SoA, Auditorías, NC Kanban, Dashboard, Usuarios

const { useState, useEffect, useRef, useMemo } = React;
const D2 = window.SGSI_DATA;


// 10. M5 — DASHBOARD
// ═════════════════════════════════════════════════════════════
function ScreenDashboard({ theme, user }) {
  const dash = D2.dashboard;
  const themes_ = D2.annexA.themes;

  return (
    <>
      {/* Greeting + main KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <Card theme={theme} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>AV</div>
              <div>
                <div style={{ fontSize: 13, color: theme.inkMuted }}>Hola,</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: theme.ink, letterSpacing: '-0.02em' }}>{user.name.split(' ')[0]}</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.45, marginBottom: 10 }}>
              Tienes <strong style={{ color: theme.ink }}>3 documentos en revisión</strong> y <strong style={{ color: theme.ink }}>2 NC vencen esta semana</strong>.
            </div>
            <Button theme={theme} variant="soft" size="sm">Ver agenda</Button>
          </div>
        </Card>
        <KPICard theme={theme} label="Madurez SGSI" value={`${dash.sgsiMaturity}%`} sub="↑ 3 pts vs Mar" sparkValues={dash.timeline.map(t => t.valor)} sparkColor={theme.accent} />
        <KPICard theme={theme} label="Controles A.5–A.8" value={`${dash.controlsImplemented}/${dash.controlsApplicable}`} sub="implementados" icon="shield" />
        <KPICard theme={theme} label="Riesgos abiertos" value={dash.openRisks} sub={`${dash.criticalRisks} críticos`} accentBg={theme.isDark ? 'rgba(248,113,113,0.18)' : '#FAD9D5'} icon="alert" />
      </div>

      {/* Center row: maturity timeline + Annex A breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 14 }}>
        <Card theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>Evolución de madurez del SGSI</div>
              <div style={{ fontSize: 11.5, color: theme.inkMuted }}>% controles implementados — últimos 6 meses</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: theme.inkMuted }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: theme.accent }} />Madurez</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: theme.chartB }} />Meta</span>
            </div>
          </div>
          <BigChart theme={theme} data={dash.timeline} />
        </Card>

        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em', marginBottom: 12 }}>Anexo A — implementación por tema</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {themes_.map(t => {
              const tCtrls = D2.annexA.controls.filter(c => c.theme === t.id);
              const tImpl = tCtrls.filter(c => c.status === 'implementado').length;
              const pct = Math.round((tImpl / Math.max(1, tCtrls.length)) * 100);
              return (
                <div key={t.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11.5 }}>
                    <span style={{ color: theme.inkSoft }}><strong style={{ color: theme.ink, fontFamily: 'ui-monospace, monospace' }}>{t.id}</strong> · {t.name}</span>
                    <span style={{ color: theme.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: theme.accent, borderRadius: 999, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 3 }}>{tImpl} de {tCtrls.length} ejemplos · {t.count} totales en estándar</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bottom row: top risks + activity + audit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Card theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>Top riesgos críticos</div>
            <Badge theme={theme} tone="danger">{D2.riesgos.filter(r => r.nivel_actual >= 15).length}</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...D2.riesgos].sort((a, b) => b.nivel_actual - a.nivel_actual).slice(0, 4).map(r => (
              <div key={r.id} style={{ padding: 10, borderRadius: theme.r.md, background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10.5, color: theme.inkMuted, fontFamily: 'ui-monospace, monospace' }}>{r.id}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: theme.ink, marginTop: 2 }}>{r.nombre}</div>
                  </div>
                  <Badge theme={theme} tone={r.nivel_actual >= 15 ? 'danger' : 'warn'}>{r.nivel_actual}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em', marginBottom: 12 }}>Actividad reciente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { who: 'Andrea Vargas', what: 'aprobó la Política de Criptografía v1.1', when: 'hace 2 h', icon: 'check', tone: theme.success, color: 'amber' },
              { who: 'Carla Ríos', what: 'creó NC-007 — MFA en cuentas de servicio', when: 'hace 5 h', icon: 'flag', tone: theme.warn, color: 'rose' },
              { who: 'Luis Mendoza', what: 'actualizó el control A.5.15', when: 'ayer', icon: 'shield', tone: theme.accent, color: 'sky' },
              { who: 'José Quispe', what: 'cerró NC-009 (proveedor X)', when: 'ayer', icon: 'check', tone: theme.success, color: 'emerald' },
              { who: 'IA', what: 'sugirió 3 nuevos riesgos basados en CISA', when: 'hace 2 d', icon: 'sparkle', tone: theme.accent, color: 'violet' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar name={a.who} color={a.color} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: theme.ink, lineHeight: 1.45 }}>
                    <strong>{a.who}</strong> {a.what}
                  </div>
                  <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 2 }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em', marginBottom: 12 }}>Próxima auditoría externa</div>
          <div style={{
            padding: 16, borderRadius: theme.r.lg,
            background: `linear-gradient(135deg, ${theme.accent}1A, ${theme.accent}05)`,
            border: `1px solid ${theme.borderStrong}`,
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: theme.accent, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{dash.daysToAudit}<span style={{ fontSize: 14, fontWeight: 500, color: theme.inkSoft }}> días</span></div>
            <div style={{ fontSize: 12, color: theme.ink, marginTop: 4, fontWeight: 500 }}>15-Sep a 26-Sep 2026</div>
            <div style={{ fontSize: 11.5, color: theme.inkMuted, marginTop: 1 }}>BSI Group Perú · Certificación inicial</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Pendientes para auditoría</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { l: 'Probar BCP completo', d: 'Q3' },
              { l: 'Cerrar NC mayores (3)', d: 'May' },
              { l: 'Capacitación phishing 100%', d: 'Jun' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: theme.inkSoft }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${theme.borderStrong}`, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.l}</span>
                <Badge theme={theme} tone="neutral">{t.d}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Aprobaciones (entidad: aprobacion) ──────────────────────── */}
      <div style={{ marginTop: 14 }}>
        <ApprovalsPanel theme={theme} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Aprobaciones — workflow para alcance / objetivo / documento
// ─────────────────────────────────────────────────────────────
function ApprovalsPanel({ theme }) {
  const D = window.SGSI_DATA;
  const [rows, setRows] = useState(D.aprobaciones || []);
  const [filter, setFilter] = useState('todos');

  const entityName = (a) => {
    if (a.tipo_entidad === 'alcance')   return D.organizacion.alcance_sgsi ? `Alcance SGSI (${D.organizacion.codigo})` : 'Alcance SGSI';
    if (a.tipo_entidad === 'objetivo')  return (D.objetivos_sgsi.find(o => o.id === a.entidad_id) || {}).nombre || `Objetivo #${a.entidad_id}`;
    if (a.tipo_entidad === 'documento') return (D.documentos.find(d => d.id === a.entidad_id) || {}).nombre || `Documento #${a.entidad_id}`;
    return a.tipo_entidad;
  };
  const entityCode = (a) => {
    if (a.tipo_entidad === 'objetivo')  return (D.objetivos_sgsi.find(o => o.id === a.entidad_id) || {}).codigo || '';
    if (a.tipo_entidad === 'documento') return (D.documentos.find(d => d.id === a.entidad_id) || {}).codigo || '';
    if (a.tipo_entidad === 'alcance')   return D.organizacion.codigo || '';
    return '';
  };

  const counts = {
    todos:      rows.length,
    pendiente:  rows.filter(r => r.estado === 'pendiente').length,
    aprobado:   rows.filter(r => r.estado === 'aprobado').length,
    rechazado:  rows.filter(r => r.estado === 'rechazado').length,
  };
  const filtered = filter === 'todos' ? rows : rows.filter(r => r.estado === filter);
  const today = '2026-05-14';
  const eTone = { aprobado: 'success', pendiente: 'warn', rechazado: 'danger' };
  const tipoTone = { alcance: 'accent', objetivo: 'info', documento: 'neutral' };

  const respond = (id, estado) => setRows(arr => arr.map(r => r.id === id ? { ...r, estado, fecha_respuesta: r.fecha_respuesta || today } : r));

  return (
    <Card theme={theme} padding={0}>
      <div style={{ padding: 16, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em' }}>Aprobaciones</div>
          <div style={{ fontSize: 11.5, color: theme.inkMuted, marginTop: 2 }}>Workflow para alcance, objetivos y documentos · entidad <code style={{ fontSize: 10.5 }}>aprobacion</code></div>
        </div>
        <Tabs theme={theme} value={filter} onChange={setFilter} items={[
          { id: 'todos',      label: 'Todas',       count: counts.todos },
          { id: 'pendiente',  label: 'Pendientes',  count: counts.pendiente },
          { id: 'aprobado',   label: 'Aprobadas',   count: counts.aprobado },
          { id: 'rechazado',  label: 'Rechazadas',  count: counts.rechazado },
        ]} />
      </div>

      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              {['Código', 'Tipo', 'Entidad', 'Comentario', 'Solicitud', 'Vence', 'Respuesta', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                <td style={{ padding: '12px 14px', fontFamily: 'ui-monospace,monospace', fontSize: 11.5, color: theme.inkMuted }}>{a.codigo}</td>
                <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={tipoTone[a.tipo_entidad]}>{a.tipo_entidad}</Badge></td>
                <td style={{ padding: '12px 14px', color: theme.ink }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{entityName(a)}</div>
                  {entityCode(a) && <div style={{ fontSize: 10.5, color: theme.inkMuted, fontFamily: 'ui-monospace,monospace' }}>{entityCode(a)}</div>}
                </td>
                <td style={{ padding: '12px 14px', color: theme.inkSoft, maxWidth: 320, fontSize: 12 }}>{a.comentario}</td>
                <td style={{ padding: '12px 14px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>{(a.fecha_solicitud || '').slice(0, 10)}</td>
                <td style={{ padding: '12px 14px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>{a.fecha_vencimiento}</td>
                <td style={{ padding: '12px 14px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>{a.fecha_respuesta ? (a.fecha_respuesta || '').slice(0, 10) : '—'}</td>
                <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={eTone[a.estado]} dot>{a.estado}</Badge></td>
                <td style={{ padding: '12px 14px' }}>
                  {a.estado === 'pendiente' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button theme={theme} size="sm" variant="primary" icon={<Icon name="check" size={12} />} onClick={() => respond(a.id, 'aprobado')}>Aprobar</Button>
                      <Button theme={theme} size="sm" variant="danger" icon={<Icon name="x" size={12} />} onClick={() => respond(a.id, 'rechazado')}>Rechazar</Button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: theme.inkMuted }}>Resuelta</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 18, textAlign: 'center', color: theme.inkMuted, fontStyle: 'italic' }}>Sin aprobaciones en esta vista.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BigChart({ theme, data }) {
  const w = 600, h = 180, pad = 30;
  const max = 100, min = 50;
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (w - pad * 2));
  const ys = data.map(d => h - pad - ((d.valor - min) / (max - min)) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const area = `${path} L${xs[xs.length - 1]},${h - pad} L${xs[0]},${h - pad} Z`;
  const targetY = h - pad - ((75 - min) / (max - min)) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 200 }}>
      <defs>
        <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={theme.accent} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0, 1, 2, 3].map(i => {
        const y = pad + (i / 3) * (h - pad * 2);
        return <line key={i} x1={pad} y1={y} x2={w - pad / 2} y2={y} stroke={theme.border} strokeDasharray="2 4" />;
      })}
      {/* target */}
      <line x1={pad} y1={targetY} x2={w - pad / 2} y2={targetY} stroke={theme.chartB} strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={w - pad / 2} y={targetY - 4} fontSize="10" fill={theme.chartB} textAnchor="end" fontWeight="600">Meta 75%</text>
      {/* area */}
      <path d={area} fill="url(#gA)" />
      <path d={path} stroke={theme.accent} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* points */}
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r={4} fill={theme.surfaceSolid} stroke={theme.accent} strokeWidth={2} />
          <text x={x} y={ys[i] - 10} fontSize="10" fill={theme.ink} textAnchor="middle" fontWeight="600">{data[i].valor}</text>
          <text x={x} y={h - 8} fontSize="10" fill={theme.inkMuted} textAnchor="middle">{data[i].mes}</text>
        </g>
      ))}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// 11. M6 — USUARIOS
// ═════════════════════════════════════════════════════════════
function ScreenUsuarios({ theme }) {
  const D = window.SGSI_DATA;
  const [users, setUsers] = useState(D.usuarios);
  const [filter, setFilter] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editRow, setEditRow] = useState(null);
  const setF = (k, v) => setForm(s => ({ ...s, [k]: v }));

  // Deterministic avatar color from name
  const avatarColors = ['amber','sky','rose','emerald','violet','orange','pink','teal','red','slate'];
  const avatarColor  = (nombre) => avatarColors[(nombre || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % avatarColors.length];

  const counts = {
    todos:      users.length,
    activo:     users.filter(u => u.estado === 'activo').length,
    invitado:   users.filter(u => u.estado === 'invitado').length,
    suspendido: users.filter(u => u.estado === 'suspendido').length,
  };
  const filtered = filter === 'todos' ? users : users.filter(u => u.estado === filter);
  const eTone    = { activo: 'success', invitado: 'info', suspendido: 'danger' };
  const roles    = ['Oficial de SI', 'Administrador SGSI', 'Auditor interno', 'Operador TI', 'Responsable de proceso', 'Lector'];

  const inputStyle = { width: '100%', height: 36, padding: '0 12px', borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: theme.isDark ? 'rgba(0,0,0,0.25)' : '#fff', color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: 'block', marginBottom: 6 };
  const FF = ({ label, children, span = 1 }) => <div style={{ gridColumn: `span ${span}` }}><label style={labelStyle}>{label}</label>{children}</div>;
  const Pills = ({ value, options, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => { const a = value === o; return <button key={o} type="button" onClick={() => onChange(o)} style={{ height: 28, padding: '0 10px', borderRadius: 999, border: `1px solid ${a ? theme.accent : theme.border}`, background: a ? theme.accent : 'transparent', color: a ? '#fff' : theme.inkSoft, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer' }}>{o}</button>; })}
    </div>
  );

  const fmtAcceso = (ts) => {
    if (!ts) return 'Pendiente';
    const d = new Date(ts), now = new Date('2026-05-14T12:00:00');
    const diff = Math.round((now - d) / 60000);
    if (diff < 60)    return `Hace ${diff} min`;
    if (diff < 1440)  return `Hace ${Math.round(diff/60)} h`;
    if (diff < 10080) return `Hace ${Math.round(diff/1440)} días`;
    return `Hace ${Math.round(diff/10080)} semanas`;
  };

  const save = () => {
    setUsers(arr => [...arr, {
      id: Date.now(), organizacion_id: 1,
      nombre: form.nombre || '',
      correo: form.correo || '',
      funcion: form.funcion || '',
      rol: form.rol || 'Lector',
      area: form.area || '',
      mfa_activo: !!form.mfa_activo,
      ultimo_acceso_at: null,
      estado: form.estado || 'invitado',
    }]);
    setModalOpen(false); setForm({});
  };

  return (
    <>
      <SectionHeader theme={theme} title="Usuarios y roles" subtitle="M6 · RBAC — campos del esquema: usuario"
        actions={<>
          <Button theme={theme} variant="ghost" size="sm" icon={<Icon name="msft" size={13} />}>Sincronizar Azure Entra ID</Button>
          <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setModalOpen(true); setForm({}); }}>Registrar usuario</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KPICard theme={theme} label="Usuarios totales" value={users.length} sub={`${counts.activo} activos`} icon="users" />
        <KPICard theme={theme} label="Cobertura MFA" value={`${Math.round(users.filter(u => u.mfa_activo).length / users.length * 100)}%`} sub={`${users.filter(u => !u.mfa_activo).length} sin MFA`} accentBg={theme.isDark ? 'rgba(52,211,153,0.18)' : '#D6F2E5'} icon="lock" />
        <KPICard theme={theme} label="Invitaciones" value={counts.invitado} sub="pendientes" icon="bell" />
        <KPICard theme={theme} label="Roles" value={roles.length} sub="definidos en RBAC" icon="settings" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        <Card theme={theme} padding={0}>
          <div style={{ padding: 14, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Tabs theme={theme} value={filter} onChange={setFilter} items={[
              { id: 'todos', label: 'Todos', count: counts.todos },
              { id: 'activo', label: 'Activos', count: counts.activo },
              { id: 'invitado', label: 'Invitados', count: counts.invitado },
              { id: 'suspendido', label: 'Suspendidos', count: counts.suspendido },
            ]} />
          </div>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                  {['Usuario', 'Función', 'Rol', 'Área', 'MFA', 'Estado', 'Último acceso', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                    onDoubleClick={() => setEditRow(u)}
                    onMouseEnter={e => e.currentTarget.style.background = theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.nombre} color={avatarColor(u.nombre)} size={32} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink, letterSpacing: '-0.005em' }}>{u.nombre}</div>
                          <div style={{ fontSize: 11, color: theme.inkMuted }}>{u.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: theme.inkSoft, fontSize: 12 }}>{u.funcion}</td>
                    <td style={{ padding: '12px 14px', color: theme.ink }}>{u.rol}</td>
                    <td style={{ padding: '12px 14px', color: theme.inkSoft }}>{u.area}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {u.mfa_activo ? <Badge theme={theme} tone="success" dot>Activo</Badge> : <Badge theme={theme} tone="danger" dot>Pendiente</Badge>}
                    </td>
                    <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={eTone[u.estado]} dot>{u.estado}</Badge></td>
                    <td style={{ padding: '12px 14px', color: theme.inkSoft }}>{fmtAcceso(u.ultimo_acceso_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button style={{ background: 'transparent', border: 'none', color: theme.inkMuted, cursor: 'pointer', padding: 4 }}><Icon name="settings" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em', marginBottom: 12 }}>Distribución de roles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roles.map(r => {
              const n = users.filter(u => u.rol === r).length;
              const pct = (n / users.length) * 100;
              return (
                <div key={r}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11.5 }}>
                    <span style={{ color: theme.inkSoft }}>{r}</span>
                    <span style={{ color: theme.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                  </div>
                  <div style={{ height: 5, background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: theme.accent, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal nuevo usuario */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} theme={theme}
        title="Registrar usuario" subtitle="Entidad: usuario" width={600}
        footer={<><Button theme={theme} variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button theme={theme} variant="primary" onClick={save} icon={<Icon name="check" size={13} />}>Guardar</Button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FF label="Nombre completo" span={2}><input style={inputStyle} placeholder="Nombre del usuario" value={form.nombre||''} onChange={e => setF('nombre', e.target.value)} /></FF>
          <FF label="Correo corporativo" span={2}><input style={inputStyle} type="email" placeholder="usuario@loginorte.com.pe" value={form.correo||''} onChange={e => setF('correo', e.target.value)} /></FF>
          <FF label="Función"><input style={inputStyle} placeholder="Analista de SI" value={form.funcion||''} onChange={e => setF('funcion', e.target.value)} /></FF>
          <FF label="Área"><select style={inputStyle} value={form.area||''} onChange={e => setF('area', e.target.value)}><option value="">Seleccionar…</option>{['Seguridad','TI','Auditoría','Operaciones','Finanzas','RR.HH.','Legal','Gerencia','Calidad'].map(o=><option key={o}>{o}</option>)}</select></FF>
          <FF label="Rol" span={2}><Pills value={form.rol} options={roles} onChange={v => setF('rol', v)} /></FF>
          <FF label="MFA requerido"><Pills value={form.mfa_activo ? 'Sí' : (form.mfa_activo === false ? 'No' : '')} options={['Sí','No']} onChange={v => setF('mfa_activo', v==='Sí')} /></FF>
          <FF label="Estado"><Pills value={form.estado} options={['activo','invitado']} onChange={v => setF('estado', v)} /></FF>
        </div>
      </Modal>

      {/* Double-click edit */}
      {editRow && React.createElement(window.RowEditModal, { open: true, onClose: () => setEditRow(null), theme, item: editRow })}
    </>
  );
}
Object.assign(window, {
  ScreenDashboard, ScreenUsuarios,
});
