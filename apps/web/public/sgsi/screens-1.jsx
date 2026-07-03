// SGSI Platform — Screens part 1
// Landing, Onboarding, M1 Contexto, M1 Alcance, M2 Documentos, M3 Riesgos

const { useState, useEffect, useRef, useMemo } = React;
const D = window.SGSI_DATA;
const Field2 = window.Field2;

// ═════════════════════════════════════════════════════════════
// 1. LANDING PAGE
// ═════════════════════════════════════════════════════════════
function ScreenLanding({ theme, onGetStarted, onLogin }) {
  return (
    <div style={{ height: '100%', overflow: 'auto', position: 'relative', padding: 32 }}>
      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 56 }}>
        <Logo theme={theme} size={32} />
        <nav style={{ display: 'flex', gap: 28, fontSize: 13, color: theme.inkSoft }}>
          <span style={{ cursor: 'pointer' }}>Producto</span>
          <span style={{ cursor: 'pointer' }}>Módulos</span>
          <span style={{ cursor: 'pointer' }}>ISO 27001</span>
          <span style={{ cursor: 'pointer' }}>Precios</span>
          <span style={{ cursor: 'pointer' }}>Recursos</span>
        </nav>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button theme={theme} variant="ghost" size="sm" onClick={onLogin}>Iniciar sesión</Button>
          <Button theme={theme} variant="primary" size="sm" onClick={onGetStarted}>Empezar</Button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 880, margin: '0 auto 56px', textAlign: 'center' }}>
        <Badge theme={theme} tone="accent" style={{ marginBottom: 18 }} dot>
          ISO/IEC 27001:2022 — Anexo A actualizado
        </Badge>
        <h1 style={{
          fontSize: 56, fontWeight: 600, color: theme.ink,
          letterSpacing: '-0.04em', lineHeight: 1.05, margin: 0, textWrap: 'balance',
        }}>
          Tu Sistema de Gestión<br />de Seguridad de la Información,<br />
          <span style={{ color: theme.accent, fontStyle: 'italic', fontWeight: 500 }}>simplificado.</span>
        </h1>
        <p style={{ fontSize: 16, color: theme.inkSoft, lineHeight: 1.55, marginTop: 22, maxWidth: 620, marginInline: 'auto' }}>
          SGSI Platform centraliza tu contexto, alcance, riesgos, controles, auditorías y SoA en un solo lugar.
          Diseñado para empresas medianas que se certifican en ISO 27001:2022.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
          <Button theme={theme} variant="primary" size="lg" onClick={onGetStarted}>
            Empezar gratis
          </Button>
          <Button theme={theme} variant="ghost" size="lg" icon={<Icon name="eye" size={15} />}>
            Ver demo
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24, fontSize: 11.5, color: theme.inkMuted }}>
          <span>✓ Multitenant SaaS</span>
          <span>✓ Login con Microsoft Azure AD</span>
          <span>✓ 14 días de prueba</span>
        </div>
      </div>

      {/* Hero visual — module preview */}
      <div style={{ maxWidth: 1080, margin: '0 auto 80px' }}>
        <Card theme={theme} padding={24} style={{ position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
            {[
              { label: 'Madurez SGSI', val: '73%', sub: '+5 últ. mes', icon: 'shield', tone: theme.accent },
              { label: 'Controles A.5–A.8', val: '68/92', sub: 'aplicables', icon: 'check', tone: theme.success },
              { label: 'Riesgos abiertos', val: '12', sub: '2 críticos', icon: 'alert', tone: theme.danger },
              { label: 'Documentos', val: '47', sub: '91% vigentes', icon: 'doc', tone: theme.info },
              { label: 'No conformidades', val: '9', sub: 'en curso', icon: 'flag', tone: theme.warn },
              { label: 'Próx. auditoría', val: '140d', sub: '15-Sep-26', icon: 'clipboard', tone: theme.inkSoft },
            ].map((k, i) => (
              <div key={i} style={{
                padding: 14, borderRadius: theme.r.lg,
                background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${theme.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: theme.inkMuted, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                  <Icon name={k.icon} size={11} color={k.tone} />
                  {k.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: theme.ink, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{k.val}</div>
                <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modules section */}
      <div style={{ maxWidth: 1080, margin: '0 auto 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Cobertura completa</div>
          <h2 style={{ fontSize: 32, fontWeight: 600, color: theme.ink, letterSpacing: '-0.03em', margin: 0 }}>
            Seis módulos, un sistema integrado.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { mod: 'M1', title: 'Contexto y Alcance', desc: 'Análisis PESTEL, partes interesadas y delimitación del SGSI según cláusulas 4.1–4.3.', icon: 'layers' },
            { mod: 'M2', title: 'Documentos', desc: 'Políticas, procedimientos y registros con control de versiones y vigencia.', icon: 'doc' },
            { mod: 'M3', title: 'Riesgos y SoA', desc: 'Matriz 5×5, tratamiento y Declaración de Aplicabilidad de los 93 controles.', icon: 'shield' },
            { mod: 'M4', title: 'Auditorías y NC', desc: 'Programa anual, hallazgos y kanban de no conformidades con plan de acción.', icon: 'clipboard' },
            { mod: 'M5', title: 'Dashboard', desc: 'KPIs de madurez, cumplimiento, riesgos y métricas para alta dirección.', icon: 'dashboard' },
            { mod: 'M6', title: 'Usuarios y roles', desc: 'RBAC con Azure AD: Oficial SI, Auditor, Responsable, Operador, Lector.', icon: 'users' },
          ].map((m, i) => (
            <Card key={i} theme={theme} hover padding={20}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={m.icon} size={16} color={theme.accentDeep} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.accent, letterSpacing: '0.06em' }}>{m.mod}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, letterSpacing: '-0.01em', marginBottom: 6 }}>{m.title}</div>
              <div style={{ fontSize: 12.5, color: theme.inkMuted, lineHeight: 1.5 }}>{m.desc}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 720, margin: '0 auto 32px', textAlign: 'center' }}>
        <Card theme={theme} padding={36} style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, ${theme.surfaceSolid})` }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, color: theme.ink, letterSpacing: '-0.025em', margin: 0 }}>
            Empieza tu certificación hoy.
          </h2>
          <p style={{ fontSize: 13.5, color: theme.inkSoft, marginTop: 10, marginBottom: 22 }}>
            Sin tarjeta. Configuración guiada en 10 minutos.
          </p>
          <Button theme={theme} variant="primary" size="lg" onClick={onGetStarted}>
            Empezar ahora
          </Button>
        </Card>
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 24, borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: theme.inkMuted }}>
        <span>© 2026 SGSI Platform · Lima, Perú</span>
        <span>ISO/IEC 27001:2022 · Ley 29733 · GDPR-ready</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 2. ONBOARDING (pasos 1 y 4 únicamente)
// ═════════════════════════════════════════════════════════════
function ScreenOnboarding({ theme, onComplete, onBack }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    company: 'LogiNorte SAC',
    ruc: '20512345678',
    sector: 'Logística',
    employees: '200',
    location: 'Lima, Perú',
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const total = 2;

  return (
    <div style={{ height: '100%', overflow: 'auto', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Logo theme={theme} size={36} />
        </div>

        {/* Stepper — 2 pasos */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 22 }}>
          {[1, 2].map(n => (
            <React.Fragment key={n}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                background: n <= step ? theme.accent : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                color: n <= step ? '#fff' : theme.inkMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, transition: 'all .2s',
              }}>{n < step ? <Icon name="check" size={13} /> : n}</div>
              {n < 2 && <div style={{ width: 72, height: 2, background: n < step ? theme.accent : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'), borderRadius: 999 }} />}
            </React.Fragment>
          ))}
        </div>

        <Card theme={theme} padding={32}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Paso {step} de {total}
          </div>

          {/* ── Paso 1: Datos de la organización ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: theme.ink, letterSpacing: '-0.02em', margin: 0 }}>Bienvenido a SGSI Platform</h2>
              <p style={{ fontSize: 13.5, color: theme.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
                Configuremos tu organización en 2 pasos. Prepararemos tus controles, documentos y matriz de riesgos según ISO 27001:2022.
              </p>
              <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <Field theme={theme} label="Razón social" value={form.company} onChange={v => update('company', v)} />
                  <Field theme={theme} label="RUC" value={form.ruc} onChange={v => update('ruc', v)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Select theme={theme} label="Sector" value={form.sector} options={['Logística', 'Banca', 'Salud', 'Retail', 'Tecnología', 'Educación']} onChange={v => update('sector', v)} />
                  <Field theme={theme} label="N° colaboradores" value={form.employees} onChange={v => update('employees', v)} />
                  <Field theme={theme} label="Sede principal" value={form.location} onChange={v => update('location', v)} />
                </div>
              </div>
            </>
          )}

          {/* ── Paso 2: Conectar cuenta ── */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: theme.ink, letterSpacing: '-0.02em', margin: 0 }}>Conecta tu cuenta empresarial</h2>
              <p style={{ fontSize: 13.5, color: theme.inkSoft, marginTop: 8 }}>Inicia sesión con Microsoft Azure AD para sincronizar usuarios y aplicar SSO.</p>
              <div style={{ marginTop: 22, display: 'grid', gap: 10 }}>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: theme.r.md,
                  background: theme.surfaceSolid, border: `1px solid ${theme.borderStrong}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Icon name="msft" size={22} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Continuar con Microsoft</div>
                    <div style={{ fontSize: 11.5, color: theme.inkMuted }}>Azure AD · SSO · MFA</div>
                  </div>
                  <Icon name="arrowR" size={16} color={theme.inkSoft} />
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, color: theme.inkMuted, fontSize: 11 }}>
                  <div style={{ height: 1, background: theme.border }} />
                  <span>o</span>
                  <div style={{ height: 1, background: theme.border }} />
                </div>
                <Field theme={theme} label="Email corporativo" value="andrea.vargas@loginorte.com.pe" onChange={() => {}} />
                <Field theme={theme} label="Contraseña" type="password" value="••••••••••" onChange={() => {}} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <Button theme={theme} variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onBack()}>Atrás</Button>
            {step < total
              ? <Button theme={theme} variant="primary" onClick={() => setStep(step + 1)} icon={<Icon name="arrowR" size={14} />}>Continuar</Button>
              : <Button theme={theme} variant="primary" onClick={onComplete} icon={<Icon name="check" size={14} />}>Registrar</Button>
            }
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 3. LOGIN
// ═════════════════════════════════════════════════════════════
function ScreenLogin({ theme, onComplete, onBack }) {
  const [email, setEmail] = useState('andrea.vargas@loginorte.com.pe');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onComplete(); }, 900);
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Logo theme={theme} size={34} />
        </div>

        <Card theme={theme} padding={32}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: theme.ink, letterSpacing: '-0.02em', margin: 0 }}>Iniciar sesión</h2>
            <p style={{ fontSize: 13, color: theme.inkSoft, marginTop: 6 }}>Accede a tu SGSI Platform</p>
          </div>

          {/* Azure AD */}
          <button onClick={handleLogin} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 16px', borderRadius: theme.r.md,
            background: theme.surfaceSolid, border: `1px solid ${theme.borderStrong}`,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
            transition: 'box-shadow .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.accent}44`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <Icon name="msft" size={20} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Continuar con Microsoft</div>
              <div style={{ fontSize: 11, color: theme.inkMuted }}>Azure AD · SSO · MFA</div>
            </div>
            <Icon name="arrowR" size={15} color={theme.inkSoft} />
          </button>

          {/* Divider */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ height: 1, background: theme.border }} />
            <span style={{ fontSize: 11, color: theme.inkMuted }}>o ingresa con email</span>
            <div style={{ height: 1, background: theme.border }} />
          </div>

          {/* Email + contraseña */}
          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <Field theme={theme} label="Correo electrónico" value={email} onChange={setEmail} type="email" />
            <Field theme={theme} label="Contraseña" value={pass} onChange={setPass} type="password" />
          </div>

          <Button theme={theme} variant="primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleLogin} disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: theme.inkSoft,
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>← Volver al inicio</button>
        </div>
      </div>
    </div>
  );
}

function Field({ theme, label, value, onChange, type = 'text' }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft, letterSpacing: '-0.005em' }}>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{
          height: 40, padding: '0 12px',
          borderRadius: theme.r.md,
          background: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${theme.border}`,
          color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none',
        }}
        onFocus={e => e.target.style.borderColor = theme.accent}
        onBlur={e => e.target.style.borderColor = theme.border}
      />
    </label>
  );
}
function Select({ theme, label, value, options, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          height: 40, padding: '0 12px',
          borderRadius: theme.r.md,
          background: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${theme.border}`,
          color: theme.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none',
        }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function ScreenDocumentos({ theme, onOpenDoc }) {
  const [filter, setFilter] = useState('todos');
  const docs = D.documentos;
  const counts = {
    todos: docs.length,
    aprobado: docs.filter(d => d.estado === 'aprobado').length,
    revision: docs.filter(d => d.estado === 'revision').length,
    borrador: docs.filter(d => d.estado === 'borrador').length,
  };
  const filtered = filter === 'todos' ? docs : docs.filter(d => d.estado === filter);
  const estadoTone = { aprobado: 'success', revision: 'warn', borrador: 'neutral' };
  const estadoLabel = { aprobado: 'Aprobado', revision: 'En revisión', borrador: 'Borrador' };

  return (
    <>
      <SectionHeader theme={theme} title="Documentos del SGSI" subtitle="Cláusula 7.5 · Información documentada — políticas, procedimientos, registros"
        actions={<>
          <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13} />}>Nuevo documento</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KPICard theme={theme} label="Total docs" value={docs.length} sub="información documentada" sparkValues={[38, 40, 42, 44, 46, 47]} sparkColor={theme.chartA} />
        <KPICard theme={theme} label="Vigentes" value={`${Math.round(counts.aprobado / docs.length * 100)}%`} sub={`${counts.aprobado} aprobados`} icon="check" accentBg={theme.isDark ? 'rgba(52,211,153,0.18)' : '#D6F2E5'} />
        <KPICard theme={theme} label="En revisión" value={counts.revision} sub="requieren atención" icon="refresh" accentBg={theme.isDark ? 'rgba(251,191,36,0.18)' : '#FCEDC9'} />
        <KPICard theme={theme} label="Por vencer en 90d" value="3" sub="políticas y planes" icon="alert" accentBg={theme.isDark ? 'rgba(248,113,113,0.18)' : '#FAD9D5'} />
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
                {['Código', 'Nombre', 'Tipo', 'Estado', 'Versión', 'Autor', 'Actualizado', 'Vigencia', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer' }}
                  onClick={() => onOpenDoc && onOpenDoc(d)}
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
                  <td style={{ padding: '12px 14px' }}><Badge theme={theme} tone={estadoTone[d.estado]} dot>{estadoLabel[d.estado]}</Badge></td>
                  <td style={{ padding: '12px 14px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{d.version}</td>
                  <td style={{ padding: '12px 14px', color: theme.inkSoft }}>{d.autor}</td>
                  <td style={{ padding: '12px 14px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{d.actualizado}</td>
                  <td style={{ padding: '12px 14px', color: theme.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{d.vigencia}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button style={{ background: 'transparent', border: 'none', color: theme.inkMuted, cursor: 'pointer', padding: 4 }}>
                      <Icon name="chevR" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ═════════════════════════════════════════════════════════════

Object.assign(window, {
  ScreenLanding, ScreenOnboarding, ScreenLogin,
});
