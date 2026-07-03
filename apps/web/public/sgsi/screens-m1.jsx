// GrowthSI Platform — M1 screens: Contexto + Alcance SGSI
// Entidades: organizacion, sede, factor, parte_interesada, proceso, activo_informacion, objetivo_sgsi

const { useState: m1uS, useMemo: m1uM } = React;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tipoTone(t) {
  return ({ Amenaza:'danger', Debilidad:'warn', Oportunidad:'success', Fortaleza:'success',
    Externa:'info', Interna:'accent', Misional:'accent', Soporte:'info', Estratégico:'success',
    Información:'accent', Software:'info', Hardware:'warn', Personas:'success', Servicio:'neutral',
  }[t] || 'neutral');
}
const impactoTone    = i => ({crítico:'danger',alto:'warn',medio:'info',bajo:'neutral'}[i]||'neutral');
const valoracionTone = v => ({crítico:'danger',alto:'warn',medio:'info',bajo:'neutral'}[v]||'neutral');
const criticidadTone = c => c==='alta'?'danger':c==='media'?'warn':'neutral';
const clasifTone     = c => c==='Confidencial'?'danger':c==='Restringido'?'warn':c==='Interno'?'info':'neutral';
const estadoTone     = e => ({activo:'success',activa:'success',operativo:'success',inactivo:'neutral',suspendido:'danger'}[e]||'neutral');
const relevanciaTone = r => ({alta:'warn',media:'info',baja:'neutral'}[r]||'neutral');

// ═════════════════════════════════════════════════════════════════════════════
// ScreenContexto — M1 · Cláusula 4.1–4.2
// ═════════════════════════════════════════════════════════════════════════════
function ScreenContexto({ theme, onOpenItem }) {
  const D = window.SGSI_DATA;
  const [tab, setTab]           = m1uS('perfil');
  const [modalOpen, setModalOpen] = m1uS(false);
  const [kind, setKind]         = m1uS(null);
  const [form, setForm]         = m1uS({});
  const [org, setOrg]           = m1uS({ ...D.organizacion });
  const [sedes, setSedes]       = m1uS(D.sedes);
  const [factores, setFactores] = m1uS(D.factores);
  const [partes, setPartes]     = m1uS(D.partes_interesadas);
  const [procesos, setProcesos] = m1uS(D.procesos);
  const [activos, setActivos]   = m1uS(D.activos);
  const [editRow, setEditRow]   = m1uS(null);

  const setF = k => v => setForm(s => ({ ...s, [k]: v }));
  const setFE = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const openNew   = k => { setKind(k); setForm({}); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setKind(null); setForm({}); };

  // Shared input styles
  const IS = { width:'100%', height:36, padding:'0 12px', borderRadius:theme.r.md, border:`1px solid ${theme.border}`, background:theme.isDark?'rgba(0,0,0,0.25)':'#fff', color:theme.ink, fontSize:13, fontFamily:'inherit', outline:'none', transition:'border-color .15s' };
  const TS = { ...IS, height:'auto', padding:'10px 12px', resize:'vertical', minHeight:70, lineHeight:1.5 };
  const LS = { fontSize:11.5, fontWeight:600, color:theme.inkSoft, letterSpacing:'0.01em', display:'block', marginBottom:6 };

  const FF = ({ label, children, span=1, hint }) => (
    <div style={{ gridColumn:`span ${span}` }}>
      <label style={LS}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:10.5, color:theme.inkMuted, marginTop:4 }}>{hint}</div>}
    </div>
  );

  const Pills = ({ value, options, onChange }) => (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {options.map(o => {
        const a = value === o;
        return <button key={o} type="button" onClick={() => onChange(o)} style={{ height:30, padding:'0 12px', borderRadius:999, border:`1px solid ${a?theme.accent:theme.border}`, background:a?theme.accent:'transparent', color:a?'#fff':theme.inkSoft, fontSize:12, fontWeight:500, fontFamily:'inherit', cursor:'pointer', transition:'all .12s' }}>{o}</button>;
      })}
    </div>
  );

  // Inline perfil editor
  const PE = (k, label, opts={}) => {
    const val = org[k] ?? '';
    if (opts.textarea) return (
      <FF label={label} span={opts.span||2}>
        <textarea style={TS} value={val} onChange={e => setOrg(o=>({...o,[k]:e.target.value}))} />
      </FF>
    );
    if (opts.select) return (
      <FF label={label} span={opts.span||1}>
        <select style={IS} value={val} onChange={e => setOrg(o=>({...o,[k]:e.target.value}))}>
          {opts.select.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </FF>
    );
    return (
      <FF label={label} span={opts.span||1}>
        <input style={IS} type={opts.type||'text'} value={val} onChange={e => setOrg(o=>({...o,[k]:opts.type==='number'?Number(e.target.value):e.target.value}))} />
      </FF>
    );
  };

  // ─── Save handlers (código auto-incremental, sin exposición al usuario) ────
  const saveSede = () => {
    setSedes(arr => [...arr, {
      id:Date.now(), organizacion_id:1,
      codigo:`SED-${String(arr.length+1).padStart(3,'0')}`,
      nombre_sede:form.nombre_sede||'', pais_sede:form.pais_sede||'Perú',
      departamento_sede:form.departamento_sede||'', provincia_sede:form.provincia_sede||'',
      distrito_sede:form.distrito_sede||'', incluido_alcance:false,
      estado:form.estado||'activo',
    }]);
    closeModal();
  };
  const saveFactor = () => {
    setFactores(arr => [...arr, {
      id:Date.now(), organizacion_id:1,
      codigo:`F-${String(arr.length+1).padStart(3,'0')}`,
      origen:form.origen||'Externo', categoria:form.categoria||'—',
      tipo:form.tipo||'Amenaza', descripcion:form.descripcion||'',
      impacto:form.impacto||'medio', estado:form.estado||'activo',
      fecha_identificacion:form.fecha_identificacion||new Date().toISOString().slice(0,10),
    }]);
    closeModal();
  };
  const saveParte = () => {
    setPartes(arr => [...arr, {
      id:Date.now(), organizacion_id:1,
      codigo:`PI-${String(arr.length+1).padStart(3,'0')}`,
      nombre:form.nombre||'—', tipo:form.tipo||'Externa',
      expectativas:form.expectativas||'', requisitos:form.requisitos||'',
      relevancia:form.relevancia||'media', contacto:form.contacto||'',
      frecuencia_interaccion:form.frecuencia_interaccion||'—',
      responsable_interno:form.responsable_interno||'—', estado:form.estado||'activa',
    }]);
    closeModal();
  };
  const saveProceso = () => {
    setProcesos(arr => [...arr, {
      id:Date.now(), organizacion_id:1,
      codigo:`PR-OP-${String(arr.length+1).padStart(3,'0')}`,
      nombre:form.nombre||'', tipo:form.tipo||'Misional',
      area:form.area||'', criticidad:form.criticidad||'media',
      kpis:form.kpis||'', descripcion:form.descripcion||'',
      incluido_alcance:false, estado:form.estado||'operativo',
    }]);
    closeModal();
  };
  const saveActivo = () => {
    setActivos(arr => [...arr, {
      id:Date.now(), organizacion_id:1,
      codigo:`AI-${String(arr.length+1).padStart(3,'0')}`,
      nombre:form.nombre||'', tipo:form.tipo||'Información',
      formato:form.formato||'Digital', ubicacion:form.ubicacion||'',
      clasificacion:form.clasificacion||'Interno',
      confidencialidad:form.confidencialidad||'media',
      integridad:form.integridad||'media', disponibilidad:form.disponibilidad||'media',
      valoracion:form.valoracion||'medio', estado:form.estado||'operativo',
      modelo:form.modelo||'', version:form.version||'', proveedor:form.proveedor||'',
    }]);
    closeModal();
  };
  const save = () => {
    if (kind==='factor')  return saveFactor();
    if (kind==='parte')   return saveParte();
    if (kind==='proceso') return saveProceso();
    if (kind==='activo')  return saveActivo();
    if (kind==='sede')    return saveSede();
  };

  // ─── Tab config ───────────────────────────────────────────────────────────
  const tabs = [
    { id:'perfil',   label:'Perfil',               icon:'home' },
    { id:'sedes',    label:'Sedes',                icon:'target', count:sedes.length },
    { id:'factores', label:'Factores I/E',         icon:'layers', count:factores.length },
    { id:'partes',   label:'Partes interesadas',   icon:'users',  count:partes.length },
    { id:'procesos', label:'Procesos',             icon:'grid',   count:procesos.length },
    { id:'activos',  label:'Activos de información',icon:'shield', count:activos.length },
  ];
  const newBtn = { sedes:{label:'Nueva sede',kind:'sede'}, factores:{label:'Nuevo factor',kind:'factor'}, partes:{label:'Nueva parte',kind:'parte'}, procesos:{label:'Nuevo proceso',kind:'proceso'}, activos:{label:'Nuevo activo',kind:'activo'} }[tab];
  const fExt = factores.filter(f=>f.origen==='Externo').length;
  const fInt = factores.length - fExt;

  return (
    <>
      <SectionHeader theme={theme} title="Contexto interno y externo" subtitle="Cláusula 4.1–4.2 ISO 27001:2022 · Perfil de la organización y análisis del entorno"
        actions={<>
          {tab==='perfil'
            ? <Button theme={theme} variant="primary" size="sm" icon={<Icon name="check" size={13}/>}>Guardar cambios</Button>
            : newBtn && <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13}/>} onClick={()=>openNew(newBtn.kind)}>{newBtn.label}</Button>}
        </>} />

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:16 }}>
        <KPICard theme={theme} label="Sedes" value={sedes.length} sub={`${sedes.filter(s=>s.incluido_alcance).length} en alcance`} icon="target" />
        <KPICard theme={theme} label="Factores ext." value={fExt} sub="amenazas / oport." icon="arrowU" />
        <KPICard theme={theme} label="Factores int." value={fInt} sub="fortalezas / deb." icon="arrowD" />
        <KPICard theme={theme} label="Partes inter." value={partes.length} sub={`${partes.filter(p=>p.tipo==='Externa').length} externas`} icon="users" />
        <KPICard theme={theme} label="Procesos" value={procesos.length} sub={`${procesos.filter(p=>p.criticidad==='alta').length} críticos`} icon="grid" />
        <KPICard theme={theme} label="Activos" value={activos.length} sub={`${activos.filter(a=>a.valoracion==='crítico').length} críticos`} icon="shield" accentBg={theme.isDark?'rgba(248,113,113,0.18)':'#FAD9D5'} />
      </div>

      <Card theme={theme} padding={0}>
        <div style={{ padding:16, borderBottom:`1px solid ${theme.border}`, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <Tabs theme={theme} value={tab} onChange={setTab} items={tabs} />
        </div>

        <div style={{ overflow:'auto' }}>

          {/* ══ PERFIL ══════════════════════════════════════════════════ */}
          {tab==='perfil' && (
            <div style={{ padding:20, display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>
              {/* Resumen card */}
              <div style={{ padding:20, borderRadius:theme.r.lg, background:theme.isDark?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.5)', border:`1px solid ${theme.border}`, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:12, height:'fit-content' }}>
                <div style={{ width:88, height:88, borderRadius:20, background:theme.accentSoft, color:theme.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, fontWeight:700, border:`1px solid ${theme.borderStrong}` }}>
                  {(org.nombre_organizacion||'LN').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:17, fontWeight:700, color:theme.ink, letterSpacing:'-0.01em' }}>{org.nombre_organizacion}</div>
                  <div style={{ fontSize:12.5, color:theme.inkMuted, marginTop:2 }}>{org.sector}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
                  <Badge theme={theme} tone={estadoTone(org.estado)} dot>{org.estado}</Badge>
                  <Badge theme={theme} tone="info">{org.estado_sgsi}</Badge>
                </div>
                <div style={{ width:'100%', padding:10, borderRadius:theme.r.md, background:theme.accentSoft, border:`1px solid ${theme.borderStrong}`, fontSize:11, color:theme.inkSoft, lineHeight:1.5 }}>
                  <strong style={{color:theme.ink}}>Código:</strong> <span style={{fontFamily:'ui-monospace,monospace'}}>{org.codigo}</span><br/>
                  <strong style={{color:theme.ink}}>RUC:</strong> <span style={{fontFamily:'ui-monospace,monospace'}}>{org.ruc}</span>
                </div>
              </div>

              {/* Formulario — sin sección alcance_sgsi */}
              <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>Identificación</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    <FF label="Código" hint="Asignado automáticamente">
                      <input style={{ ...IS, opacity:0.6, cursor:'not-allowed' }} value={org.codigo} readOnly disabled />
                    </FF>
                    {PE('nombre_organizacion','Nombre de la organización',{span:2})}
                    {PE('ruc','RUC')}
                    {PE('sector','Sector',{select:['Logística y transporte','Banca y finanzas','Salud','Retail','Tecnología','Educación','Manufactura','Servicios']})}
                    {PE('dominio','Dominio')}
                    {PE('numero_colaboradores','N° colaboradores',{type:'number'})}
                    {PE('inicio_proyecto','Inicio de proyecto',{type:'date'})}
                    {PE('estado','Estado',{select:['activo','inactivo','suspendido']})}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>Misión</div>
                  {PE('mision','',{textarea:true})}
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>Visión</div>
                  {PE('vision','',{textarea:true})}
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>Estado del SGSI</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                    {PE('estado_sgsi','Fase actual',{select:['Diagnóstico','Planificación','Implementación','Operación','Certificado']})}
                    <FF label="Norma de referencia">
                      <input style={{ ...IS, background:'transparent', cursor:'not-allowed', opacity:0.7 }} value="ISO/IEC 27001:2022" readOnly />
                    </FF>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ SEDES ════════════════════════════════════════════════════ */}
          {tab==='sedes' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ background:theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)' }}>
                  {['Código','Nombre sede','País','Departamento','Provincia','Distrito','Alcance','Estado',''].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:10.5, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sedes.map(s=>(
                  <tr key={s.id} style={{ borderTop:`1px solid ${theme.border}`, cursor:'pointer' }}
                    onClick={()=>onOpenItem&&onOpenItem('sede',s)}
                    onDoubleClick={e=>{e.stopPropagation();setEditRow(s);}}
                    onMouseEnter={e=>e.currentTarget.style.background=theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px', fontFamily:'ui-monospace,monospace', fontSize:11.5, color:theme.inkMuted }}>{s.codigo}</td>
                    <td style={{ padding:'12px 14px', color:theme.ink, fontWeight:500 }}>{s.nombre_sede}</td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft }}>{s.pais_sede}</td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft }}>{s.departamento_sede}</td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft }}>{s.provincia_sede}</td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft }}>{s.distrito_sede}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={s.incluido_alcance?'success':'neutral'} dot>{s.incluido_alcance?'incluida':'fuera'}</Badge></td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={estadoTone(s.estado)}>{s.estado}</Badge></td>
                    <td style={{ padding:'12px 14px' }}><button onClick={e=>e.stopPropagation()} style={{ background:'transparent', border:'none', color:theme.inkMuted, cursor:'pointer', padding:4 }}><Icon name="edit" size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ══ FACTORES ═════════════════════════════════════════════════ */}
          {tab==='factores' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ background:theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)' }}>
                  {['Código','Origen','Categoría','Tipo','Descripción','Impacto','F. identificación','Estado',''].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:10.5, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {factores.map(it=>(
                  <tr key={it.id} style={{ borderTop:`1px solid ${theme.border}`, cursor:'pointer' }}
                    onClick={()=>onOpenItem&&onOpenItem('factor',it)}
                    onDoubleClick={e=>{e.stopPropagation();setEditRow(it);}}
                    onMouseEnter={e=>e.currentTarget.style.background=theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px', fontFamily:'ui-monospace,monospace', fontSize:11.5, color:theme.inkMuted }}>{it.codigo}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={it.origen==='Externo'?'info':'accent'}>{it.origen}</Badge></td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft }}>{it.categoria}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={tipoTone(it.tipo)} dot>{it.tipo}</Badge></td>
                    <td style={{ padding:'12px 14px', color:theme.ink, maxWidth:380 }}>{it.descripcion}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={impactoTone(it.impacto)}>{it.impacto}</Badge></td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft, fontVariantNumeric:'tabular-nums', fontFamily:'ui-monospace,monospace', fontSize:11.5 }}>{it.fecha_identificacion}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={estadoTone(it.estado)} dot>{it.estado}</Badge></td>
                    <td style={{ padding:'12px 14px' }}><button onClick={e=>e.stopPropagation()} style={{ background:'transparent', border:'none', color:theme.inkMuted, cursor:'pointer', padding:4 }}><Icon name="edit" size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ══ PARTES INTERESADAS ═══════════════════════════════════════ */}
          {tab==='partes' && (
            <div style={{ padding:16, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {partes.map(p=>(
                <div key={p.id} onClick={()=>onOpenItem&&onOpenItem('parte',p)} style={{ padding:14, borderRadius:theme.r.lg, background:theme.isDark?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.5)', border:`1px solid ${theme.border}`, cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=theme.borderStrong}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=theme.border}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, gap:10 }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:10.5, color:theme.inkMuted, fontFamily:'ui-monospace,monospace', marginBottom:2 }}>{p.codigo}</div>
                      <div style={{ fontSize:13.5, fontWeight:600, color:theme.ink }}>{p.nombre}</div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexDirection:'column', alignItems:'flex-end' }}>
                      <Badge theme={theme} tone={tipoTone(p.tipo)}>{p.tipo}</Badge>
                      <Badge theme={theme} tone={relevanciaTone(p.relevancia)} dot>{p.relevancia}</Badge>
                    </div>
                  </div>
                  <div style={{ fontSize:11.5, color:theme.inkSoft, lineHeight:1.5, marginBottom:8 }}>{p.expectativas}</div>
                  <div style={{ display:'flex', gap:14, fontSize:10.5, color:theme.inkMuted, paddingTop:8, borderTop:`1px solid ${theme.border}` }}>
                    <span><strong style={{color:theme.inkSoft}}>Resp.:</strong> {p.responsable_interno}</span>
                    <span><strong style={{color:theme.inkSoft}}>Frec.:</strong> {p.frecuencia_interaccion}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ PROCESOS ═════════════════════════════════════════════════ */}
          {tab==='procesos' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ background:theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)' }}>
                  {['Código','Proceso','Tipo','Área','Criticidad','KPIs','Alcance','Estado'].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:10.5, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {procesos.map(p=>(
                  <tr key={p.id} style={{ borderTop:`1px solid ${theme.border}`, cursor:'pointer' }}
                    onClick={()=>onOpenItem&&onOpenItem('proceso',p)}
                    onDoubleClick={e=>{e.stopPropagation();setEditRow(p);}}
                    onMouseEnter={e=>e.currentTarget.style.background=theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px', fontFamily:'ui-monospace,monospace', fontSize:11.5, color:theme.inkMuted }}>{p.codigo}</td>
                    <td style={{ padding:'12px 14px', color:theme.ink, fontWeight:500 }}>{p.nombre}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={tipoTone(p.tipo)}>{p.tipo}</Badge></td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft }}>{p.area}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={criticidadTone(p.criticidad)} dot>{p.criticidad}</Badge></td>
                    <td style={{ padding:'12px 14px', color:theme.inkSoft, fontSize:11.5, maxWidth:280 }}>{p.kpis}</td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={p.incluido_alcance?'success':'neutral'} dot>{p.incluido_alcance?'incluido':'fuera'}</Badge></td>
                    <td style={{ padding:'12px 14px' }}><Badge theme={theme} tone={estadoTone(p.estado)}>{p.estado}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ══ ACTIVOS ══════════════════════════════════════════════════ */}
          {tab==='activos' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ background:theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)' }}>
                  {['Código','Activo','Tipo','Formato','Ubicación','Clasif.','C·I·D','Valoración','Proveedor','Estado'].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'11px 12px', fontSize:10.5, fontWeight:600, color:theme.inkMuted, letterSpacing:'0.05em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activos.map(a=>(
                  <tr key={a.id} style={{ borderTop:`1px solid ${theme.border}`, cursor:'pointer' }}
                    onClick={()=>onOpenItem&&onOpenItem('activo',a)}
                    onDoubleClick={e=>{e.stopPropagation();setEditRow(a);}}
                    onMouseEnter={e=>e.currentTarget.style.background=theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'11px 12px', fontFamily:'ui-monospace,monospace', fontSize:11.5, color:theme.inkMuted }}>{a.codigo}</td>
                    <td style={{ padding:'11px 12px', color:theme.ink, fontWeight:500 }}>{a.nombre}</td>
                    <td style={{ padding:'11px 12px' }}><Badge theme={theme} tone={tipoTone(a.tipo)}>{a.tipo}</Badge></td>
                    <td style={{ padding:'11px 12px', color:theme.inkSoft }}>{a.formato}</td>
                    <td style={{ padding:'11px 12px', color:theme.inkSoft, fontSize:11.5, maxWidth:220 }}>{a.ubicacion}</td>
                    <td style={{ padding:'11px 12px' }}><Badge theme={theme} tone={clasifTone(a.clasificacion)}>{a.clasificacion}</Badge></td>
                    <td style={{ padding:'11px 12px', fontFamily:'ui-monospace,monospace', fontSize:11, color:theme.inkSoft }}>
                      <span title={`C:${a.confidencialidad} I:${a.integridad} D:${a.disponibilidad}`}>
                        {a.confidencialidad[0].toUpperCase()}·{a.integridad[0].toUpperCase()}·{a.disponibilidad[0].toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding:'11px 12px' }}><Badge theme={theme} tone={valoracionTone(a.valoracion)} dot>{a.valoracion}</Badge></td>
                    <td style={{ padding:'11px 12px', color:theme.inkSoft, fontSize:11.5 }}>{a.proveedor}</td>
                    <td style={{ padding:'11px 12px' }}><Badge theme={theme} tone={estadoTone(a.estado)}>{a.estado}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ─── Modal: Nuevo registro ─────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={closeModal} theme={theme}
        title={kind?`Nuevo · ${{factor:'Factor I/E',parte:'Parte interesada',proceso:'Proceso',activo:'Activo de información',sede:'Sede'}[kind]||''}` : ''}
        subtitle="Complete los datos del nuevo registro."
        width={kind==='proceso'||kind==='activo'||kind==='parte'?720:580}
        footer={kind&&<><Button theme={theme} variant="ghost" onClick={closeModal}>Cancelar</Button><Button theme={theme} variant="primary" onClick={save} icon={<Icon name="check" size={13}/>}>Guardar</Button></>}>

        {/* ── SEDE ─────────────────────── */}
        {kind==='sede' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <FF label="Código" hint="Se asigna automáticamente al guardar">
              <input style={{...IS,opacity:0.55,cursor:'not-allowed'}} placeholder={`SED-${String(sedes.length+1).padStart(3,'0')}`} disabled readOnly />
            </FF>
            <FF label="Nombre de la sede">
              <input style={IS} placeholder="Sede comercial Cusco" value={form.nombre_sede||''} onChange={e=>setFE('nombre_sede',e.target.value)} />
            </FF>
            <FF label="País"><input style={IS} placeholder="Perú" value={form.pais_sede||''} onChange={e=>setFE('pais_sede',e.target.value)} /></FF>
            <FF label="Departamento"><input style={IS} placeholder="Cusco" value={form.departamento_sede||''} onChange={e=>setFE('departamento_sede',e.target.value)} /></FF>
            <FF label="Provincia"><input style={IS} placeholder="Cusco" value={form.provincia_sede||''} onChange={e=>setFE('provincia_sede',e.target.value)} /></FF>
            <FF label="Distrito"><input style={IS} placeholder="Wánchaq" value={form.distrito_sede||''} onChange={e=>setFE('distrito_sede',e.target.value)} /></FF>
            <FF label="Estado"><Pills value={form.estado} options={['activo','inactivo']} onChange={v=>setFE('estado',v)} /></FF>
          </div>
        )}

        {/* ── FACTOR ───────────────────── */}
        {kind==='factor' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <FF label="Código" hint="Se asigna automáticamente al guardar">
              <input style={{...IS,opacity:0.55,cursor:'not-allowed'}} placeholder={`F-${String(factores.length+1).padStart(3,'0')}`} disabled readOnly />
            </FF>
            <FF label="Origen"><Pills value={form.origen} options={['Externo','Interno']} onChange={v=>setFE('origen',v)} /></FF>
            <FF label="Categoría">
              <select style={IS} value={form.categoria||''} onChange={e=>setFE('categoria',e.target.value)}>
                <option value="">Seleccionar…</option>
                {['Político-legal','Económico','Social','Tecnológico','Ambiental','Estructura','Tecnología','Procesos','Personas','Cultura'].map(o=><option key={o}>{o}</option>)}
              </select>
            </FF>
            <FF label="Tipo"><Pills value={form.tipo} options={form.origen==='Interno'?['Fortaleza','Debilidad']:['Amenaza','Oportunidad']} onChange={v=>setFE('tipo',v)} /></FF>
            <FF label="Impacto"><Pills value={form.impacto} options={['bajo','medio','alto','crítico']} onChange={v=>setFE('impacto',v)} /></FF>
            <FF label="Fecha de identificación"><input style={IS} type="date" value={form.fecha_identificacion||''} onChange={e=>setFE('fecha_identificacion',e.target.value)} /></FF>
            <FF label="Estado"><Pills value={form.estado} options={['activo','inactivo']} onChange={v=>setFE('estado',v)} /></FF>
            <FF label="Descripción" span={2}><textarea style={TS} placeholder="Describe el factor y por qué impacta al SGSI…" value={form.descripcion||''} onChange={e=>setFE('descripcion',e.target.value)} /></FF>
          </div>
        )}

        {/* ── PARTE INTERESADA ─────────── */}
        {kind==='parte' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <FF label="Código" hint="Se asigna automáticamente al guardar">
              <input style={{...IS,opacity:0.55,cursor:'not-allowed'}} placeholder={`PI-${String(partes.length+1).padStart(3,'0')}`} disabled readOnly />
            </FF>
            <FF label="Nombre"><input style={IS} placeholder="Ej. Clientes corporativos…" value={form.nombre||''} onChange={e=>setFE('nombre',e.target.value)} /></FF>
            <FF label="Tipo"><Pills value={form.tipo} options={['Interna','Externa']} onChange={v=>setFE('tipo',v)} /></FF>
            <FF label="Relevancia"><Pills value={form.relevancia} options={['baja','media','alta']} onChange={v=>setFE('relevancia',v)} /></FF>
            <FF label="Expectativas" span={2}><textarea style={TS} placeholder="¿Qué espera del SGSI?" value={form.expectativas||''} onChange={e=>setFE('expectativas',e.target.value)} /></FF>
            <FF label="Requisitos" span={2}><textarea style={TS} placeholder="Requisitos formales (acuerdos, regulación, etc.)" value={form.requisitos||''} onChange={e=>setFE('requisitos',e.target.value)} /></FF>
            <FF label="Contacto"><input style={IS} placeholder="contacto@parte.com" value={form.contacto||''} onChange={e=>setFE('contacto',e.target.value)} /></FF>
            <FF label="Frecuencia de interacción">
              <select style={IS} value={form.frecuencia_interaccion||''} onChange={e=>setFE('frecuencia_interaccion',e.target.value)}>
                <option value="">Seleccionar…</option>
                {['Diaria','Semanal','Quincenal','Mensual','Trimestral','Anual','Bajo demanda'].map(o=><option key={o}>{o}</option>)}
              </select>
            </FF>
            <FF label="Responsable interno"><input style={IS} placeholder="Nombre del responsable" value={form.responsable_interno||''} onChange={e=>setFE('responsable_interno',e.target.value)} /></FF>
            <FF label="Estado"><Pills value={form.estado} options={['activa','inactiva']} onChange={v=>setFE('estado',v)} /></FF>
          </div>
        )}

        {/* ── PROCESO ──────────────────── */}
        {kind==='proceso' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <FF label="Código" hint="Se asigna automáticamente al guardar">
              <input style={{...IS,opacity:0.55,cursor:'not-allowed'}} placeholder={`PR-OP-${String(procesos.length+1).padStart(3,'0')}`} disabled readOnly />
            </FF>
            <FF label="Nombre del proceso"><input style={IS} placeholder="Gestión de transporte y rutas" value={form.nombre||''} onChange={e=>setFE('nombre',e.target.value)} /></FF>
            <FF label="Tipo"><Pills value={form.tipo} options={['Estratégico','Misional','Soporte']} onChange={v=>setFE('tipo',v)} /></FF>
            <FF label="Criticidad"><Pills value={form.criticidad} options={['baja','media','alta']} onChange={v=>setFE('criticidad',v)} /></FF>
            <FF label="Área responsable">
              <select style={IS} value={form.area||''} onChange={e=>setFE('area',e.target.value)}>
                <option value="">Seleccionar…</option>
                {['Operaciones','Finanzas','Comercial','RR.HH.','TI','Legal','Calidad'].map(o=><option key={o}>{o}</option>)}
              </select>
            </FF>
            <FF label="Estado"><Pills value={form.estado} options={['operativo','inactivo']} onChange={v=>setFE('estado',v)} /></FF>
            <FF label="KPIs / Indicadores" span={2}><textarea style={{...TS,minHeight:56}} placeholder="Ej. SLA de entrega 99.5%, NPS…" value={form.kpis||''} onChange={e=>setFE('kpis',e.target.value)} /></FF>
            <FF label="Descripción" span={2}><textarea style={TS} placeholder="Describe el alcance del proceso…" value={form.descripcion||''} onChange={e=>setFE('descripcion',e.target.value)} /></FF>
          </div>
        )}

        {/* ── ACTIVO DE INFORMACIÓN ────── */}
        {kind==='activo' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <FF label="Código" hint="Se asigna automáticamente al guardar">
              <input style={{...IS,opacity:0.55,cursor:'not-allowed'}} placeholder={`AI-${String(activos.length+1).padStart(3,'0')}`} disabled readOnly />
            </FF>
            <FF label="Nombre del activo"><input style={IS} placeholder="Base de datos de clientes" value={form.nombre||''} onChange={e=>setFE('nombre',e.target.value)} /></FF>
            <FF label="Tipo"><Pills value={form.tipo} options={['Información','Software','Hardware','Servicio','Personas']} onChange={v=>setFE('tipo',v)} /></FF>
            <FF label="Formato"><Pills value={form.formato} options={['Digital','Físico','Mixto']} onChange={v=>setFE('formato',v)} /></FF>
            <FF label="Ubicación" span={2}><input style={IS} placeholder="Ej. Azure SQL East US 2 / CD Callao Rack 3" value={form.ubicacion||''} onChange={e=>setFE('ubicacion',e.target.value)} /></FF>
            <FF label="Clasificación" span={2}><Pills value={form.clasificacion} options={['Público','Interno','Restringido','Confidencial']} onChange={v=>setFE('clasificacion',v)} /></FF>
            <FF label="Confidencialidad"><Pills value={form.confidencialidad} options={['baja','media','alta']} onChange={v=>setFE('confidencialidad',v)} /></FF>
            <FF label="Integridad"><Pills value={form.integridad} options={['baja','media','alta']} onChange={v=>setFE('integridad',v)} /></FF>
            <FF label="Disponibilidad"><Pills value={form.disponibilidad} options={['baja','media','alta']} onChange={v=>setFE('disponibilidad',v)} /></FF>
            <FF label="Valoración"><Pills value={form.valoracion} options={['bajo','medio','alto','crítico']} onChange={v=>setFE('valoracion',v)} /></FF>
            <FF label="Modelo"><input style={IS} placeholder="Ej. Azure SQL Database / Dell R750" value={form.modelo||''} onChange={e=>setFE('modelo',e.target.value)} /></FF>
            <FF label="Versión"><input style={IS} placeholder="Ej. 12.0 / 3.4.2" value={form.version||''} onChange={e=>setFE('version',e.target.value)} /></FF>
            <FF label="Proveedor"><input style={IS} placeholder="Ej. Microsoft Azure / SAP / Interno" value={form.proveedor||''} onChange={e=>setFE('proveedor',e.target.value)} /></FF>
            <FF label="Estado"><Pills value={form.estado} options={['operativo','inactivo','retirado']} onChange={v=>setFE('estado',v)} /></FF>
          </div>
        )}
      </Modal>

      {/* Double-click row edit */}
      {editRow && React.createElement(window.RowEditModal, { open: true, onClose: () => setEditRow(null), theme, item: editRow })}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ScreenAlcance — M1 · Cláusula 4.3 + Objetivos del SGSI
// ═════════════════════════════════════════════════════════════════════════════
function ScreenAlcance({ theme }) {
  const D = window.SGSI_DATA;
  const [alcanceTab, setAlcanceTab] = m1uS('config');
  const [alcanceTxt, setAlcanceTxt] = m1uS(D.organizacion.alcance_sgsi);
  const [sedes, setSedes]           = m1uS(D.sedes);
  const [procesos, setProcesos]     = m1uS(D.procesos);
  const [objetivos, setObjetivos]   = m1uS(D.objetivos_sgsi || []);
  const [objModal, setObjModal]     = m1uS(false);
  const [objForm, setObjForm]       = m1uS({});
  const [genModal, setGenModal]     = m1uS(false);
  const [genLoading, setGenLoading] = m1uS(false);
  const [genText, setGenText]       = m1uS('');
  const [selectedObj, setSelectedObj] = m1uS(null);
  const [editRow, setEditRow]         = m1uS(null);
  const procesoActivo = D.proceso_activo;
  const activos = D.activos;

  const setOF = (k,v) => setObjForm(s=>({...s,[k]:v}));
  const toggleSede    = id => setSedes(arr=>arr.map(s=>s.id===id?{...s,incluido_alcance:!s.incluido_alcance}:s));
  const toggleProceso = id => setProcesos(arr=>arr.map(p=>p.id===id?{...p,incluido_alcance:!p.incluido_alcance}:p));
  const sedesIn    = sedes.filter(s=>s.incluido_alcance);
  const procesosIn = procesos.filter(p=>p.incluido_alcance);

  const activosCubiertos = m1uM(() => {
    const ids = new Set(procesoActivo.filter(pa=>procesosIn.some(p=>p.id===pa.proceso_id)).map(pa=>pa.activo_informacion_id));
    return activos.filter(a=>ids.has(a.id));
  }, [procesosIn]);
  const grouped = activosCubiertos.reduce((acc,a)=>{(acc[a.tipo]=acc[a.tipo]||[]).push(a);return acc;},{});

  const IS = { width:'100%', height:36, padding:'0 12px', borderRadius:theme.r.md, border:`1px solid ${theme.border}`, background:theme.isDark?'rgba(0,0,0,0.25)':'#fff', color:theme.ink, fontSize:13, fontFamily:'inherit', outline:'none' };
  const LS = { fontSize:11.5, fontWeight:600, color:theme.inkSoft, display:'block', marginBottom:6 };
  const FF = ({label,children,span=1,hint})=>(
    <div style={{gridColumn:`span ${span}`}}>
      <label style={LS}>{label}</label>
      {children}
      {hint&&<div style={{fontSize:10.5,color:theme.inkMuted,marginTop:4}}>{hint}</div>}
    </div>
  );

  const saveObjetivo = () => {
    setObjetivos(arr=>[...arr,{
      id:Date.now(), organizacion_id:1,
      codigo:`OBJ-${String(arr.length+1).padStart(3,'0')}`,
      nombre:objForm.nombre||'', indicador:objForm.indicador||'',
      meta:objForm.meta||'', valor_actual:objForm.valor_actual||'—',
      responsable:objForm.responsable||'',
      fecha_inicio:objForm.fecha_inicio||'', fecha_fin:objForm.fecha_fin||'',
      estado:objForm.estado||'en_curso',
    }]);
    setObjModal(false); setObjForm({});
  };

  const handleGenAlcance = async () => {
    setGenLoading(true); setGenText('');
    try {
      const org = D.organizacion;
      const prompt = `Eres experto en ISO 27001:2022. Redacta un párrafo de alcance del SGSI para "${org.nombre_organizacion}" del sector "${org.sector}" con ${org.numero_colaboradores} colaboradores. Sedes en alcance: ${sedesIn.map(s=>s.nombre_sede).join(', ')||'ninguna definida'}. Procesos en alcance: ${procesosIn.map(p=>p.nombre).join(', ')||'ninguno definido'}. Misión: "${(org.mision||'').substring(0,150)}". Escribe 2-3 párrafos concisos que mencionen activos clave, límites organizacionales y exclusiones. Solo el texto del alcance, sin encabezados.`;
      setGenText(await window.claude.complete(prompt));
    } catch { setGenText('No se pudo generar el alcance. Intente nuevamente.'); }
    setGenLoading(false);
  };

  const estadoObjTone  = e=>({en_curso:'info',aprobado:'success',cumplido:'success',no_cumplido:'danger',cancelado:'neutral'}[e]||'neutral');
  const estadoObjLabel = e=>({en_curso:'En curso',aprobado:'Aprobado',cumplido:'Aprobado',no_cumplido:'No cumplido',cancelado:'Cancelado'}[e]||e);

  return (
    <>
      <SectionHeader theme={theme} title="Alcance del SGSI" subtitle="Cláusula 4.3 ISO 27001:2022 · Sedes, procesos incluidos y objetivos del SGSI"
        actions={<>
          {alcanceTab==='config'&&<>
            <AIButton theme={theme} label="Generar Alcance preliminar" size="sm" onClick={()=>{setGenModal(true);setGenText('');}} />
            <Button theme={theme} variant="ghost" size="sm" icon={<Icon name="refresh" size={13}/>}>Restablecer</Button>
            <Button theme={theme} variant="primary" size="sm" icon={<Icon name="check" size={13}/>}>Guardar alcance</Button>
          </>}
          {alcanceTab==='objetivos'&&(
            <Button theme={theme} variant="primary" size="sm" icon={<Icon name="plus" size={13}/>} onClick={()=>{setObjModal(true);setObjForm({});}}>Nuevo objetivo</Button>
          )}
        </>} />

      {/* Tabs internos */}
      <div style={{ marginBottom:14 }}>
        <Tabs theme={theme} value={alcanceTab} onChange={setAlcanceTab} items={[
          { id:'config',   label:'Configuración del alcance', icon:'target' },
          { id:'objetivos',label:'Objetivos del SGSI',        icon:'flag', count:objetivos.length },
        ]} />
      </div>

      {/* ══ TAB CONFIG ══════════════════════════════════════════════ */}
      {alcanceTab==='config' && (
        <>
          {/* Declaración */}
          <Card theme={theme} padding={20} style={{marginBottom:14}}>
            <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
              <div style={{width:44,height:44,borderRadius:12,background:theme.accent,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Icon name="target" size={22}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:theme.accent,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6}}>Declaración de alcance</div>
                <textarea value={alcanceTxt} onChange={e=>setAlcanceTxt(e.target.value)} style={{width:'100%',minHeight:84,padding:'10px 12px',borderRadius:theme.r.md,border:`1px solid ${theme.border}`,background:theme.isDark?'rgba(0,0,0,0.25)':'rgba(255,255,255,0.7)',color:theme.ink,fontSize:13,lineHeight:1.55,fontFamily:'inherit',outline:'none',resize:'vertical'}} />
              </div>
            </div>
          </Card>

          {/* Sedes & Procesos */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <Card theme={theme}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:theme.ink}}>Sedes en alcance</div>
                <Badge theme={theme} tone="accent">{sedesIn.length} de {sedes.length}</Badge>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {sedes.map(s=>(
                  <label key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:theme.r.md,background:s.incluido_alcance?(theme.isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.5)'):'transparent',border:`1px ${s.incluido_alcance?'solid':'dashed'} ${s.incluido_alcance?theme.border:theme.borderStrong}`,opacity:s.incluido_alcance?1:0.65,cursor:'pointer',transition:'all .15s'}}>
                    <input type="checkbox" checked={s.incluido_alcance} onChange={()=>toggleSede(s.id)} style={{accentColor:theme.accent,width:16,height:16}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontFamily:'ui-monospace,monospace',fontSize:11,color:theme.inkMuted}}>{s.codigo}</span>
                        <span style={{fontSize:12.5,color:theme.ink,fontWeight:500}}>{s.nombre_sede}</span>
                      </div>
                      <div style={{fontSize:11,color:theme.inkMuted,marginTop:2}}>{s.distrito_sede}, {s.provincia_sede} — {s.departamento_sede}</div>
                    </div>
                    <Badge theme={theme} tone={s.incluido_alcance?'success':'neutral'} dot>{s.incluido_alcance?'incluida':'fuera'}</Badge>
                  </label>
                ))}
              </div>
            </Card>

            <Card theme={theme}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:theme.ink}}>Procesos en alcance</div>
                <Badge theme={theme} tone="accent">{procesosIn.length} de {procesos.length}</Badge>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {procesos.map(p=>(
                  <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:theme.r.md,background:p.incluido_alcance?(theme.isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.5)'):'transparent',border:`1px ${p.incluido_alcance?'solid':'dashed'} ${p.incluido_alcance?theme.border:theme.borderStrong}`,opacity:p.incluido_alcance?1:0.65,cursor:'pointer',transition:'all .15s'}}>
                    <input type="checkbox" checked={p.incluido_alcance} onChange={()=>toggleProceso(p.id)} style={{accentColor:theme.accent,width:16,height:16}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontFamily:'ui-monospace,monospace',fontSize:11,color:theme.inkMuted}}>{p.codigo}</span>
                        <span style={{fontSize:12.5,color:theme.ink,fontWeight:500}}>{p.nombre}</span>
                      </div>
                      <div style={{fontSize:11,color:theme.inkMuted,marginTop:2}}>{p.area} · <span style={{color:p.criticidad==='alta'?theme.danger:p.criticidad==='media'?theme.warn:theme.inkMuted}}>{p.criticidad}</span></div>
                    </div>
                    <Badge theme={theme} tone={p.incluido_alcance?'success':'neutral'} dot>{p.incluido_alcance?'incluido':'fuera'}</Badge>
                  </label>
                ))}
              </div>
            </Card>
          </div>

          {/* Activos cubiertos */}
          <Card theme={theme}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:theme.ink}}>Activos de información cubiertos</div>
                <div style={{fontSize:11,color:theme.inkMuted,marginTop:2}}>Derivados automáticamente vía proceso_activo</div>
              </div>
              <Badge theme={theme} tone="accent">{activosCubiertos.length}</Badge>
            </div>
            {activosCubiertos.length===0
              ? <div style={{padding:20,textAlign:'center',color:theme.inkMuted,fontSize:12}}>Sin procesos incluidos en el alcance.</div>
              : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
                  {Object.keys(grouped).sort().map(tipo=>(
                    <div key={tipo} style={{padding:12,borderRadius:theme.r.md,background:theme.isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.5)',border:`1px solid ${theme.border}`}}>
                      <div style={{fontSize:10.5,fontWeight:600,color:theme.accent,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:8}}>{tipo} · {grouped[tipo].length}</div>
                      {grouped[tipo].map(a=>(
                        <div key={a.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:11.5,marginBottom:5}}>
                          <span style={{fontFamily:'ui-monospace,monospace',fontSize:10.5,color:theme.inkMuted,minWidth:50}}>{a.codigo}</span>
                          <span style={{flex:1,color:theme.ink}}>{a.nombre}</span>
                          <Badge theme={theme} tone={valoracionTone(a.valoracion)} dot>{a.valoracion}</Badge>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
            }
          </Card>
        </>
      )}

      {/* ══ TAB OBJETIVOS ══════════════════════════════════════════ */}
      {alcanceTab==='objetivos' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
            <KPICard theme={theme} label="Total objetivos" value={objetivos.length} sub="definidos" icon="target" />
            <KPICard theme={theme} label="En curso" value={objetivos.filter(o=>o.estado==='en_curso').length} sub="en seguimiento" icon="arrowR" accentBg={theme.isDark?'rgba(96,165,250,0.18)':'#D5E5F2'} />
            <KPICard theme={theme} label="Aprobados" value={objetivos.filter(o=>o.estado==='aprobado'||o.estado==='cumplido').length} sub="alcanzados" icon="check" accentBg={theme.isDark?'rgba(52,211,153,0.18)':'#D6F2E5'} />
            <KPICard theme={theme} label="Vencen 2026" value={objetivos.filter(o=>o.fecha_fin&&o.fecha_fin.startsWith('2026')).length} sub="plazo este año" icon="calendar" />
          </div>

          <Card theme={theme} padding={0}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
              <thead>
                <tr style={{background:theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'}}>
                  {['Código','Objetivo','Indicador','Meta','Valor actual','Plazo','Estado',''].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'11px 14px',fontSize:10.5,fontWeight:600,color:theme.inkMuted,letterSpacing:'0.05em',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {objetivos.map(obj=>(
                  <tr key={obj.id}
                    style={{borderTop:`1px solid ${theme.border}`, cursor:'pointer', background: selectedObj===obj.id ? (theme.isDark?'rgba(255,255,255,0.04)':theme.accentSoft) : 'transparent'}}
                    onClick={()=>setSelectedObj(selectedObj===obj.id?null:obj.id)}
                    onDoubleClick={e=>{e.stopPropagation();setEditRow(obj);}}
                    onMouseEnter={e=>{ if(selectedObj!==obj.id) e.currentTarget.style.background=theme.isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'; }}
                    onMouseLeave={e=>{ if(selectedObj!==obj.id) e.currentTarget.style.background='transparent'; }}>
                    <td style={{padding:'12px 14px',fontFamily:'ui-monospace,monospace',fontSize:11.5,color:theme.inkMuted}}>{obj.codigo}</td>
                    <td style={{padding:'12px 14px',color:theme.ink,fontWeight:500,maxWidth:240}}>{obj.nombre}</td>
                    <td style={{padding:'12px 14px',color:theme.inkSoft,fontSize:12,maxWidth:180}}>{obj.indicador}</td>
                    <td style={{padding:'12px 14px',color:theme.accent,fontWeight:600}}>{obj.meta}</td>
                    <td style={{padding:'12px 14px',color:theme.ink,fontWeight:600}}>{obj.valor_actual}</td>
                    <td style={{padding:'12px 14px',color:theme.inkSoft,fontSize:11.5,fontVariantNumeric:'tabular-nums'}}>{obj.fecha_fin}</td>
                    <td style={{padding:'12px 14px'}}><Badge theme={theme} tone={estadoObjTone(obj.estado)} dot>{estadoObjLabel(obj.estado)}</Badge></td>
                    <td style={{padding:'12px 14px'}}>
                      {selectedObj===obj.id
                        ? <button onClick={e=>{e.stopPropagation();setObjetivos(arr=>arr.map(o=>o.id===obj.id?{...o,estado:'aprobado'}:o));setSelectedObj(null);}} style={{height:28,padding:'0 12px',borderRadius:theme.r.md,border:`1px solid ${theme.success||'#22c55e'}`,background:theme.isDark?'rgba(52,211,153,0.15)':'#d6f2e5',color:theme.isDark?'#6ee7b7':'#14532d',fontSize:11.5,fontWeight:600,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
                            <Icon name="check" size={12}/> Aprobar
                          </button>
                        : <button style={{background:'transparent',border:'none',color:theme.inkMuted,cursor:'pointer',padding:4}}><Icon name="edit" size={14}/></button>
                      }
                    </td>
                  </tr>
                ))}
                {objetivos.length===0&&(
                  <tr><td colSpan={9} style={{padding:28,textAlign:'center',color:theme.inkMuted,fontSize:12}}>Aún no hay objetivos. Haz clic en "Nuevo objetivo" para agregar el primero.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Modal: Nuevo objetivo */}
      <Modal open={objModal} onClose={()=>setObjModal(false)} theme={theme}
        title="Nuevo objetivo del SGSI" subtitle="Complete los datos del nuevo objetivo." width={640}
        footer={<><Button theme={theme} variant="ghost" onClick={()=>setObjModal(false)}>Cancelar</Button><Button theme={theme} variant="primary" onClick={saveObjetivo} icon={<Icon name="check" size={13}/>}>Guardar</Button></>}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <FF label="Código" hint="Asignado automáticamente">
            <input style={{...IS,opacity:0.55,cursor:'not-allowed'}} placeholder={`OBJ-${String(objetivos.length+1).padStart(3,'0')}`} disabled readOnly />
          </FF>
          <FF label="Estado">
            <select style={IS} value={objForm.estado||'en_curso'} onChange={e=>setOF('estado',e.target.value)}>
              <option value="en_curso">En curso</option><option value="cumplido">Cumplido</option>
              <option value="no_cumplido">No cumplido</option><option value="cancelado">Cancelado</option>
            </select>
          </FF>
          <FF label="Nombre del objetivo" span={2}><input style={IS} placeholder="Ej. Reducir nivel de riesgo residual promedio a ≤7" value={objForm.nombre||''} onChange={e=>setOF('nombre',e.target.value)} /></FF>
          <FF label="Indicador" span={2}><input style={IS} placeholder="Ej. Nivel residual promedio (escala 1-25)" value={objForm.indicador||''} onChange={e=>setOF('indicador',e.target.value)} /></FF>
          <FF label="Meta"><input style={IS} placeholder="Ej. ≤7 o ≥90%" value={objForm.meta||''} onChange={e=>setOF('meta',e.target.value)} /></FF>
          <FF label="Valor actual"><input style={IS} placeholder="Ej. 9.2" value={objForm.valor_actual||''} onChange={e=>setOF('valor_actual',e.target.value)} /></FF>
          <FF label="Responsable"><input style={IS} placeholder="Nombre del responsable" value={objForm.responsable||''} onChange={e=>setOF('responsable',e.target.value)} /></FF>
          <FF label="Fecha inicio"><input style={IS} type="date" value={objForm.fecha_inicio||''} onChange={e=>setOF('fecha_inicio',e.target.value)} /></FF>
          <FF label="Fecha fin" span={2}><input style={IS} type="date" value={objForm.fecha_fin||''} onChange={e=>setOF('fecha_fin',e.target.value)} /></FF>
        </div>
      </Modal>

      {/* Modal: Generar Alcance con IA */}
      <Modal open={genModal} onClose={()=>setGenModal(false)} theme={theme}
        title="Generar Alcance preliminar" subtitle="La IA redactará el alcance basado en los datos de tu organización." width={680}
        footer={<>
          <Button theme={theme} variant="ghost" onClick={()=>setGenModal(false)}>Cerrar</Button>
          {genText&&!genLoading&&<Button theme={theme} variant="primary" icon={<Icon name="check" size={13}/>} onClick={()=>{setAlcanceTxt(genText);setGenModal(false);}}>Usar este alcance</Button>}
          {!genLoading&&<AIButton theme={theme} label={genText?'Regenerar':'Generar'} onClick={handleGenAlcance}/>}
        </>}>
        {!genText&&!genLoading&&(
          <div style={{padding:24,textAlign:'center'}}>
            <div style={{width:60,height:60,borderRadius:999,background:theme.accentSoft,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <Icon name="sparkle" size={28} color={theme.accent}/>
            </div>
            <div style={{fontSize:14,fontWeight:600,color:theme.ink,marginBottom:8}}>Generación de alcance con IA</div>
            <div style={{fontSize:12.5,color:theme.inkSoft,lineHeight:1.55,maxWidth:420,margin:'0 auto 20px'}}>
              Analizará la organización, {sedesIn.length} sede(s) y {procesosIn.length} proceso(s) seleccionado(s) para redactar una declaración alineada a ISO 27001:2022.
            </div>
            <AIButton theme={theme} label="Generar Alcance preliminar" size="md" onClick={handleGenAlcance}/>
          </div>
        )}
        {genLoading&&(
          <div style={{padding:40,textAlign:'center'}}>
            <div style={{width:40,height:40,borderRadius:999,background:theme.accentSoft,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',animation:'pulse 1.5s infinite'}}>
              <Icon name="sparkle" size={20} color={theme.accent}/>
            </div>
            <div style={{fontSize:13,color:theme.inkSoft}}>Generando alcance...</div>
          </div>
        )}
        {genText&&!genLoading&&(
          <div>
            <div style={{fontSize:11,fontWeight:600,color:theme.inkMuted,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:8}}>Alcance generado</div>
            <div style={{padding:16,borderRadius:theme.r.md,background:`linear-gradient(135deg,${theme.accent}0A,${theme.accent}04)`,border:`1px solid ${theme.borderStrong}`,fontSize:13,color:theme.ink,lineHeight:1.65,whiteSpace:'pre-wrap'}}>{genText}</div>
          </div>
        )}
      </Modal>
      {/* Double-click row edit */}
      {editRow && React.createElement(window.RowEditModal, { open: true, onClose: () => setEditRow(null), theme, item: editRow })}
    </>
  );
}

Object.assign(window, { ScreenContexto, ScreenAlcance });
