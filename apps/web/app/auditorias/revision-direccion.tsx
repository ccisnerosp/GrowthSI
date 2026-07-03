"use client";

// Revisión por la Dirección (ISO/IEC 27001:2022, cláusula 9.3) — pestaña acoplada
// al módulo de Auditorías. SIN IA: los insumos 9.3.2 se ensamblan de forma
// determinista en el servidor y aquí solo se muestran/redactan/aprueban.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, theme } from "@/lib/ui";
import type { Insumos } from "@/lib/revision-direccion-insumos";

type Completitud = { clausula: string; etiqueta: string; ok: boolean; nota: string };
type Accion = {
  id: number; descripcion: string; tipo: string; prioridad: string; estado: string;
  fecha_objetivo: string | null; fecha_cierre: string | null; responsable: string | null;
};
export type Revision = {
  id: number; codigo: string; fecha_revision: string; periodo_desde: string; periodo_hasta: string;
  asistentes: string; conclusiones: string; estado: string;
  insumos: Insumos | null; completitud: Completitud[];
  creado_por: string | null; aprobado_por: string | null; aprobado_at: string | null;
  documento: { id: number; codigo: string; nombre: string } | null;
  acciones: Accion[];
};
export type RevUsuario = { id: number; nombre: string };
export type RevPerms = { rev_create: boolean; rev_update: boolean; rev_approve: boolean; rev_delete: boolean };

const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 12px", borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.25)", color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", minHeight: 96, lineHeight: 1.55 };
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: "block", marginBottom: 6 };
const selectStyle: React.CSSProperties = { ...inputStyle };
const today = () => new Date().toISOString().slice(0, 10);

const TIPO_ACCION = [
  { v: "mejora", l: "Mejora" }, { v: "cambio_control", l: "Cambio de control" },
  { v: "cambio_objetivo", l: "Cambio de objetivo" }, { v: "recurso", l: "Recurso" },
  { v: "politica", l: "Política" }, { v: "otro", l: "Otro" },
];
const tipoLabel = (t: string) => TIPO_ACCION.find((x) => x.v === t)?.l ?? t;
const PRIORIDAD = ["alta", "media", "baja"];
const ACC_ESTADOS = ["pendiente", "en_progreso", "hecho", "cancelada"];
const accEstadoLabel = (e: string) => ({ pendiente: "Pendiente", en_progreso: "En progreso", hecho: "Hecho", cancelada: "Cancelada" } as Record<string, string>)[e] ?? e;
const accEstadoTone = (e: string): "success" | "warn" | "info" | "neutral" => e === "hecho" ? "success" : e === "en_progreso" ? "warn" : e === "cancelada" ? "neutral" : "info";
const prioTone = (p: string): "danger" | "warn" | "info" => p === "alta" ? "danger" : p === "media" ? "warn" : "info";
const revEstadoTone = (e: string): "success" | "info" => e === "aprobada" ? "success" : "info";
const revEstadoLabel = (e: string) => e === "aprobada" ? "Aprobada" : "Borrador";

export function RevisionDireccionTab({ revisiones, usuarios, perms }: {
  revisiones: Revision[]; usuarios: RevUsuario[]; perms: RevPerms;
}) {
  const router = useRouter();
  const [selId, setSelId] = useState<number | null>(revisiones[0]?.id ?? null);
  const [showNew, setShowNew] = useState(false);
  const refresh = () => router.refresh();
  const sel = revisiones.find((r) => r.id === selId) ?? null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: theme.inkMuted }}>
          Cláusula 9.3 — entradas (9.3.2) calculadas automáticamente del SGSI; conclusiones y acciones registradas por la Dirección.
        </div>
        {perms.rev_create && (
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setShowNew(true)}>Nueva revisión</Button>
        )}
      </div>

      {revisiones.length === 0 ? (
        <Empty text="Sin revisiones por la dirección. Crea la primera con “Nueva revisión”: los insumos 9.3.2 se calcularán automáticamente." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr" }}>
          {/* Lista */}
          <div style={{ borderRight: `1px solid ${theme.border}` }}>
            {revisiones.map((r, i) => {
              const active = r.id === selId;
              const pend = r.completitud.filter((c) => !c.ok).length;
              return (
                <button key={r.id} onClick={() => setSelId(r.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: "none", borderTop: i ? `1px solid ${theme.border}` : "none", background: active ? theme.accentSoft : "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontFamily: "ui-monospace,monospace", color: active ? theme.accentDeep : theme.inkMuted }}>{r.codigo}</span>
                    <Badge tone={revEstadoTone(r.estado)} dot>{revEstadoLabel(r.estado)}</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink }}>{r.fecha_revision}</div>
                  <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>{r.periodo_desde} → {r.periodo_hasta}</div>
                  {pend > 0 && <div style={{ fontSize: 10.5, color: theme.warn, marginTop: 4 }}>{pend} insumo(s) sin datos</div>}
                </button>
              );
            })}
          </div>
          {/* Detalle */}
          <div style={{ padding: 18 }}>
            {sel ? <RevisionDetalle rev={sel} usuarios={usuarios} perms={perms} onChanged={refresh} /> : <Empty text="Selecciona una revisión." />}
          </div>
        </div>
      )}

      {showNew && <NuevaRevisionModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); refresh(); }} />}
    </div>
  );
}

function RevisionDetalle({ rev, usuarios, perms, onChanged }: { rev: Revision; usuarios: RevUsuario[]; perms: RevPerms; onChanged: () => void }) {
  const aprobada = rev.estado === "aprobada";
  const editable = perms.rev_update && !aprobada;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editConcl, setEditConcl] = useState(false);
  const [accModal, setAccModal] = useState<null | { data?: Accion }>(null);
  const i = rev.insumos;

  const call = async (key: string, body: unknown) => {
    setBusy(key); setErr(null);
    try {
      const res = await fetch(`/api/revision-direccion/${rev.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return false; }
      onChanged(); return true;
    } catch { setErr("No se pudo conectar"); return false; } finally { setBusy(null); }
  };

  const recalcular = () => call("recalc", { accion: "recalcular" });
  const aprobar = async () => { if (confirm("Aprobar congela la revisión: no admitirá más cambios. ¿Continuar?")) await call("aprobar", { accion: "aprobar" }); };
  const eliminar = async () => {
    if (!confirm(`¿Eliminar la revisión ${rev.codigo}?`)) return;
    setBusy("del"); setErr(null);
    try { const res = await fetch(`/api/revision-direccion/${rev.id}`, { method: "DELETE" }); if (res.ok) onChanged(); else setErr("No se pudo eliminar"); }
    finally { setBusy(null); }
  };
  const generarActa = async () => {
    setBusy("acta"); setErr(null);
    try { const res = await fetch(`/api/revision-direccion/${rev.id}/acta`, { method: "POST" }); if (res.ok) onChanged(); else setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "No se pudo generar el acta"); }
    finally { setBusy(null); }
  };

  return (
    <div>
      {/* Cabecera + acciones */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: theme.ink }}>{rev.codigo}</span>
            <Badge tone={revEstadoTone(rev.estado)} dot>{revEstadoLabel(rev.estado)}</Badge>
          </div>
          <div style={{ fontSize: 12, color: theme.inkMuted }}>
            Revisión del {rev.fecha_revision} · periodo {rev.periodo_desde} → {rev.periodo_hasta}
            {rev.creado_por && ` · creada por ${rev.creado_por}`}
            {aprobada && rev.aprobado_por && ` · aprobada por ${rev.aprobado_por}${rev.aprobado_at ? ` (${rev.aprobado_at})` : ""}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {editable && <Button variant="ghost" size="sm" icon={<Icon name="refresh" size={13} />} onClick={recalcular} disabled={!!busy}>{busy === "recalc" ? "Recalculando…" : "Recalcular insumos"}</Button>}
          <Button variant="ghost" size="sm" icon={<Icon name="doc" size={13} />} onClick={generarActa} disabled={!!busy || !perms.rev_update}>{busy === "acta" ? "Generando…" : rev.documento ? "Regenerar acta" : "Generar acta"}</Button>
          {perms.rev_approve && !aprobada && <Button variant="primary" size="sm" icon={<Icon name="check" size={13} />} onClick={aprobar} disabled={!!busy}>Aprobar</Button>}
          {perms.rev_delete && !aprobada && <button onClick={eliminar} title="Eliminar" style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 4 }}><Icon name="trash" size={15} /></button>}
        </div>
      </div>

      {err && <ErrBox msg={err} />}
      {rev.documento && (
        <div style={{ marginBottom: 14, padding: 10, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, fontSize: 12, color: theme.inkSoft, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="doc" size={14} />
          <span>Acta documentada: <a href={`/documentos?doc=${rev.documento.id}`} style={{ color: theme.accentDeep, fontWeight: 600 }}>{rev.documento.codigo}</a> — {rev.documento.nombre}</span>
        </div>
      )}

      {/* 1. Insumos 9.3.2 */}
      <SectionTitle n="1" title="Entradas de la revisión (cláusula 9.3.2)" />
      {!i ? (
        <Empty text="Sin insumos calculados. Usa “Recalcular insumos”." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 8 }}>
          <InsumoCard tone={i.acciones_previas.vencidas > 0 ? "warn" : "neutral"} titulo="a) Acciones previas" lineas={[
            `${i.acciones_previas.total} en total`,
            `${i.acciones_previas.pendientes} pend. · ${i.acciones_previas.en_progreso} en curso · ${i.acciones_previas.hechas} hechas`,
            `${i.acciones_previas.vencidas} vencida(s)`,
          ]} />
          <InsumoCard titulo="b/d) Contexto y partes" lineas={[
            `${i.contexto.factores_total} factores I/E (${i.contexto.factores_internos} int. / ${i.contexto.factores_externos} ext.)`,
            `${i.contexto.factores_nuevos} nuevos en el periodo`,
            `${i.contexto.partes_total} partes interesadas`,
          ]} />
          <InsumoCard tone={i.auditorias.hallazgos_criticos > 0 ? "danger" : "neutral"} titulo="c) Auditorías (9.2)" lineas={[
            `${i.auditorias.total_periodo} auditoría(s) · ${i.auditorias.completadas} completada(s)`,
            `${i.auditorias.hallazgos_total} hallazgo(s) · ${i.auditorias.hallazgos_abiertos} abierto(s)`,
            `${i.auditorias.hallazgos_criticos} crítico(s)`,
          ]} />
          <InsumoCard tone={i.no_conformidades.vencidas > 0 || i.no_conformidades.criticas_abiertas > 0 ? "warn" : "neutral"} titulo="c) No conformidades (10.2)" lineas={[
            `${i.no_conformidades.total} en total · ${i.no_conformidades.abiertas} abierta(s)`,
            `${i.no_conformidades.cerradas_periodo} cerrada(s) en el periodo`,
            `${i.no_conformidades.vencidas} vencida(s) · ${i.no_conformidades.criticas_abiertas} crítica(s) abierta(s)`,
          ]} />
          <InsumoCard tone={i.objetivos.medibles > 0 && i.objetivos.medidos < i.objetivos.medibles ? "warn" : "neutral"} titulo="c) Objetivos (9.1)" lineas={[
            `${i.objetivos.total} objetivo(s) · ${i.objetivos.medibles} medible(s)`,
            `${i.objetivos.medidos}/${i.objetivos.medibles} con medición · ${i.objetivos.cumplen_meta} cumplen meta`,
            `${i.objetivos.cumplidos} marcados cumplidos · ${i.objetivos.en_curso} en curso`,
          ]} />
          <InsumoCard tone={i.riesgos.criticos > 0 || i.riesgos.fuera_tolerancia > 0 ? "warn" : "neutral"} titulo="e) Riesgos y tratamiento" lineas={[
            `${i.riesgos.total} riesgo(s) · ${i.riesgos.criticos} crítico(s)`,
            `${i.riesgos.fuera_tolerancia} fuera de tolerancia · residual prom. ${i.riesgos.nivel_residual_prom}`,
            `Controles ${i.controles.implementados}/${i.controles.aplican} impl. (${i.controles.pct_implementacion}%) · ${i.riesgos.reevaluaciones_periodo} reeval.`,
          ]} />
        </div>
      )}

      {/* Checklist completitud */}
      {rev.completitud.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Completitud de entradas (9.3.2)</div>
          <div style={{ display: "grid", gap: 4 }}>
            {rev.completitud.map((c, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.inkSoft }}>
                <span style={{ width: 16, color: c.ok ? theme.success : theme.warn }}><Icon name={c.ok ? "check" : "alert"} size={14} /></span>
                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10.5, color: theme.inkMuted, width: 64, flexShrink: 0 }}>{c.clausula}</span>
                <span style={{ fontWeight: 600, color: theme.ink, minWidth: 200 }}>{c.etiqueta}</span>
                <span style={{ color: theme.inkMuted }}>{c.nota}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Conclusiones 9.3.3 */}
      <SectionTitle n="2" title="Conclusiones y decisiones de la Dirección (cláusula 9.3.3)" right={editable ? <Button variant="ghost" size="sm" icon={<Icon name="edit" size={12} />} onClick={() => setEditConcl(true)}>Editar</Button> : undefined} />
      <div style={{ fontSize: 13, color: rev.conclusiones ? theme.inkSoft : theme.inkMuted, fontStyle: rev.conclusiones ? "normal" : "italic", whiteSpace: "pre-wrap", lineHeight: 1.55, marginBottom: 16 }}>
        {rev.conclusiones || "Pendiente de redactar. Resume idoneidad, adecuación y eficacia del SGSI, oportunidades de mejora y necesidades de cambio/recursos."}
      </div>
      {rev.asistentes && <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}><strong style={{ color: theme.inkSoft }}>Asistentes:</strong> {rev.asistentes}</div>}

      {/* 3. Acciones de mejora */}
      <SectionTitle n="3" title="Acciones de mejora acordadas (9.3.3 → 10.1)" right={editable ? <Button variant="ghost" size="sm" icon={<Icon name="plus" size={12} />} onClick={() => setAccModal({})}>Añadir acción</Button> : undefined} />
      {rev.acciones.length === 0 ? (
        <div style={{ fontSize: 12.5, color: theme.inkMuted, fontStyle: "italic", padding: "4px 0" }}>Sin acciones registradas. Las acciones se siguen hasta su cierre y entran como insumo de la próxima revisión.</div>
      ) : (
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ background: "rgba(255,255,255,0.02)" }}>{["Acción", "Tipo", "Prioridad", "Responsable", "Plazo", "Estado", ""].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {rev.acciones.map((a) => (
                <tr key={a.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                  <td style={{ ...tdStyle, color: theme.ink, maxWidth: 280 }}>{a.descripcion}</td>
                  <td style={tdStyle}><Badge tone="neutral">{tipoLabel(a.tipo)}</Badge></td>
                  <td style={tdStyle}><Badge tone={prioTone(a.prioridad)}>{a.prioridad}</Badge></td>
                  <td style={{ ...tdStyle, color: theme.inkSoft }}>{a.responsable ?? "—"}</td>
                  <td style={{ ...tdStyle, color: theme.inkSoft, fontVariantNumeric: "tabular-nums" }}>{a.fecha_objetivo ?? "—"}</td>
                  <td style={tdStyle}><Badge tone={accEstadoTone(a.estado)} dot>{accEstadoLabel(a.estado)}</Badge></td>
                  <td style={tdStyle}>{editable && <button onClick={() => setAccModal({ data: a })} title="Editar" style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 4 }}><Icon name="edit" size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editConcl && <ConclusionesModal rev={rev} onClose={() => setEditConcl(false)} onSaved={() => { setEditConcl(false); onChanged(); }} />}
      {accModal && <AccionModal revId={rev.id} data={accModal.data} usuarios={usuarios} canDelete={editable} onClose={() => setAccModal(null)} onSaved={() => { setAccModal(null); onChanged(); }} />}
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────
function SectionTitle({ n, title, right }: { n: string; title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.ink }}><span style={{ color: theme.accentDeep, marginRight: 6 }}>{n}.</span>{title}</div>
      {right}
    </div>
  );
}

function InsumoCard({ titulo, lineas, tone }: { titulo: string; lineas: string[]; tone?: "warn" | "danger" | "neutral" }) {
  const bc = tone === "danger" ? `${theme.danger}55` : tone === "warn" ? `${theme.warn}55` : theme.border;
  return (
    <div style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${bc}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.inkSoft, marginBottom: 6 }}>{titulo}</div>
      {lineas.map((l, idx) => <div key={idx} style={{ fontSize: 12, color: idx === 0 ? theme.ink : theme.inkMuted, marginTop: idx ? 2 : 0 }}>{l}</div>)}
    </div>
  );
}

function NuevaRevisionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ fecha_revision: today(), periodo_desde: "", periodo_hasta: today(), asistentes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const body: Record<string, string> = { fecha_revision: f.fecha_revision, periodo_hasta: f.periodo_hasta, asistentes: f.asistentes };
      if (f.periodo_desde) body.periodo_desde = f.periodo_desde;
      const res = await fetch("/api/revision-direccion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>Nueva revisión por la dirección</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>El código (RD-NNN) se asigna automáticamente. Los insumos 9.3.2 se calcularán del SGSI al crear. Si dejas “desde” en blanco, toma la fecha de la última revisión (o el inicio del proyecto).</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label style={labelStyle}>Fecha de la revisión</label><input style={inputStyle} type="date" value={f.fecha_revision} onChange={(e) => set("fecha_revision", e.target.value)} /></div>
          <div />
          <div><label style={labelStyle}>Periodo desde (opcional)</label><input style={inputStyle} type="date" value={f.periodo_desde} onChange={(e) => set("periodo_desde", e.target.value)} /></div>
          <div><label style={labelStyle}>Periodo hasta</label><input style={inputStyle} type="date" value={f.periodo_hasta} onChange={(e) => set("periodo_hasta", e.target.value)} /></div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Asistentes</label><textarea style={{ ...textareaStyle, minHeight: 64 }} value={f.asistentes} onChange={(e) => set("asistentes", e.target.value)} placeholder="Nombres y cargos de quienes participan en la revisión" /></div>
        </div>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Creando…" : "Crear revisión"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ConclusionesModal({ rev, onClose, onSaved }: { rev: Revision; onClose: () => void; onSaved: () => void }) {
  const [conclusiones, setConclusiones] = useState(rev.conclusiones);
  const [asistentes, setAsistentes] = useState(rev.asistentes);
  const [fecha, setFecha] = useState(rev.fecha_revision);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/revision-direccion/${rev.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conclusiones, asistentes, fecha_revision: fecha }) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={720}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>Conclusiones de la revisión {rev.codigo}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>Salidas de la cláusula 9.3.3: decisiones sobre oportunidades de mejora y cualquier necesidad de cambio en el SGSI.</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={labelStyle}>Fecha de la revisión</label><input style={inputStyle} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div />
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Asistentes</label><input style={inputStyle} value={asistentes} onChange={(e) => setAsistentes(e.target.value)} placeholder="Nombres y cargos" /></div>
        </div>
        <label style={labelStyle}>Conclusiones y decisiones</label>
        <textarea style={{ ...textareaStyle, minHeight: 200 }} value={conclusiones} onChange={(e) => setConclusiones(e.target.value)} placeholder="Idoneidad, adecuación y eficacia del SGSI; oportunidades de mejora; cambios necesarios; necesidades de recursos." />
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AccionModal({ revId, data, usuarios, canDelete, onClose, onSaved }: { revId: number; data?: Accion; usuarios: RevUsuario[]; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const edit = !!data;
  const [f, setF] = useState({
    descripcion: data?.descripcion ?? "", tipo: data?.tipo ?? "mejora", prioridad: data?.prioridad ?? "media",
    estado: data?.estado ?? "pendiente", responsable_usuario_id: "", fecha_objetivo: data?.fecha_objetivo ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.descripcion.trim().length < 3) { setErr("Describe la acción (mín. 3 caracteres)"); return; }
    setSaving(true); setErr(null);
    try {
      const url = edit ? `/api/revision-direccion/acciones/${data!.id}` : `/api/revision-direccion/${revId}/acciones`;
      const body: Record<string, unknown> = {
        descripcion: f.descripcion, tipo: f.tipo, prioridad: f.prioridad,
        fecha_objetivo: f.fecha_objetivo || null,
      };
      if (f.responsable_usuario_id) body.responsable_usuario_id = Number(f.responsable_usuario_id);
      else if (edit) body.responsable_usuario_id = null;
      if (edit) body.estado = f.estado;
      const res = await fetch(url, { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); } finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm("¿Eliminar esta acción?")) return;
    setSaving(true);
    try { const res = await fetch(`/api/revision-direccion/acciones/${data!.id}`, { method: "DELETE" }); if (res.ok) onSaved(); else setErr("No se pudo eliminar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 16 }}>{edit ? "Editar acción de mejora" : "Nueva acción de mejora"}</div>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}><label style={labelStyle}>Descripción</label><textarea style={{ ...textareaStyle, minHeight: 72 }} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Qué se hará para mejorar el SGSI" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label style={labelStyle}>Tipo</label><select style={selectStyle} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{TIPO_ACCION.map((t) => <option key={t.v} value={t.v} style={{ background: theme.surfaceSolid }}>{t.l}</option>)}</select></div>
          <div><label style={labelStyle}>Prioridad</label><select style={selectStyle} value={f.prioridad} onChange={(e) => set("prioridad", e.target.value)}>{PRIORIDAD.map((p) => <option key={p} value={p} style={{ background: theme.surfaceSolid }}>{p}</option>)}</select></div>
          <div><label style={labelStyle}>Responsable</label><select style={selectStyle} value={f.responsable_usuario_id} onChange={(e) => set("responsable_usuario_id", e.target.value)}><option value="" style={{ background: theme.surfaceSolid }}>{edit && data?.responsable ? `Actual: ${data.responsable} (sin cambio)` : "Sin asignar"}</option>{usuarios.map((u) => <option key={u.id} value={u.id} style={{ background: theme.surfaceSolid }}>{u.nombre}</option>)}</select></div>
          <div><label style={labelStyle}>Plazo</label><input style={inputStyle} type="date" value={f.fecha_objetivo} onChange={(e) => set("fecha_objetivo", e.target.value)} /></div>
          {edit && <div><label style={labelStyle}>Estado</label><select style={selectStyle} value={f.estado} onChange={(e) => set("estado", e.target.value)}>{ACC_ESTADOS.map((s) => <option key={s} value={s} style={{ background: theme.surfaceSolid }}>{accEstadoLabel(s)}</option>)}</select></div>}
        </div>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          {edit && canDelete ? <Button variant="danger" size="sm" icon={<Icon name="trash" size={13} />} onClick={del} disabled={saving}>Eliminar</Button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ onClose, width = 560, children }: { onClose: () => void; width?: number; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(12,8,20,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }}>
        {/* Popup OPACO: fondo sólido, sin transparencia ni blur (a diferencia del Card translúcido por defecto). */}
        <Card padding={24} style={{ background: theme.surfaceSolid, backdropFilter: "none", WebkitBackdropFilter: "none", boxShadow: "0 16px 48px rgba(0,0,0,0.55)" }}>{children}</Card>
      </div>
    </div>
  );
}
function ErrBox({ msg }: { msg: string }) {
  return <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{msg}</div>;
}
const thStyle: React.CSSProperties = { textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "12px 14px" };
function Empty({ text }: { text: string }) { return <div style={{ padding: 32, textAlign: "center", color: theme.inkMuted, fontStyle: "italic", fontSize: 13 }}>{text}</div>; }
