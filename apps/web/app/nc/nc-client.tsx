"use client";

import { useState, type FormEvent, type ReactNode, type DragEvent } from "react";
import { Card, Badge, Button, Icon, theme } from "@/lib/ui";

type NC = {
  id: number; auditoria_id: number; auditoria_codigo: string; codigo: string;
  titulo: string; descripcion: string; causa_raiz: string; accion_correctiva: string;
  severidad: string; estado: string;
  fecha_identificacion: string; fecha_vencimiento: string; fecha_cierre: string | null;
};
type AudRef = { id: number; codigo: string; nombre: string };
type Perms = { create: boolean; update: boolean; delete: boolean };

const SEVERIDAD = ["menor", "mayor", "critica"];
const COLS: Array<{ id: string; label: string; sub: string }> = [
  { id: "identificada", label: "Identificada", sub: "Detección inicial" },
  { id: "analisis", label: "Análisis causa", sub: "Causa raíz" },
  { id: "plan", label: "Plan de acción", sub: "Diseño de respuesta" },
  { id: "ejecucion", label: "En ejecución", sub: "Implementando" },
  { id: "cerrada", label: "Cerrada", sub: "Verificada" },
];
const NC_ESTADOS_EDIT = ["identificada", "analisis", "plan", "ejecucion", "cerrada"];

const sevTone = (s: string): "danger" | "warn" | "info" | "neutral" => s === "critica" ? "danger" : s === "mayor" ? "warn" : s === "menor" ? "info" : "neutral";
const sevLabel = (s: string): string => ({ critica: "Crítica", mayor: "Mayor", menor: "Menor" } as Record<string, string>)[s] ?? s;

const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 12px", borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.25)", color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", minHeight: 56, lineHeight: 1.5 };
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: "block", marginBottom: 6 };

function mapServerNc(n: Record<string, unknown>, auditorias: AudRef[]): NC {
  const audId = Number(n.auditoria_id);
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 10) : "");
  return {
    id: Number(n.id), auditoria_id: audId,
    auditoria_codigo: auditorias.find((a) => a.id === audId)?.codigo ?? "—",
    codigo: String(n.codigo ?? ""), titulo: String(n.titulo ?? ""), descripcion: String(n.descripcion ?? ""),
    causa_raiz: String(n.causa_raiz ?? ""), accion_correctiva: String(n.accion_correctiva ?? ""),
    severidad: String(n.severidad ?? "menor"), estado: String(n.estado ?? "identificada"),
    fecha_identificacion: s(n.fecha_identificacion), fecha_vencimiento: s(n.fecha_vencimiento),
    fecha_cierre: n.fecha_cierre ? s(n.fecha_cierre) : null,
  };
}

export function NcClient({ sessionRol, hoy, limite30, perms, auditorias, ncInicial }: {
  sessionRol: string; hoy: string; limite30: string; perms: Perms; auditorias: AudRef[]; ncInicial: NC[];
}) {
  const [items, setItems] = useState<NC[]>(ncInicial);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { data?: NC }>(null);

  const kpi = {
    abiertas: items.filter((i) => i.estado !== "cerrada").length,
    cerradas: items.filter((i) => i.estado === "cerrada").length,
    criticas: items.filter((i) => i.severidad === "critica" && i.estado !== "cerrada").length,
    porVencer: items.filter((i) => i.estado !== "cerrada" && i.fecha_vencimiento && i.fecha_vencimiento <= limite30).length,
  };

  const move = async (id: number, estado: string) => {
    const before = items;
    setItems((cur) => cur.map((i) => i.id === id ? { ...i, estado, fecha_cierre: estado === "cerrada" ? (i.fecha_cierre ?? hoy) : null } : i));
    setDragId(null); setDragOver(null);
    try {
      const res = await fetch(`/api/nc/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
      if (!res.ok) { setItems(before); alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "No se pudo mover la NC"); }
    } catch { setItems(before); alert("No se pudo conectar"); }
  };

  const onDrop = (e: DragEvent, col: string) => { e.preventDefault(); if (dragId != null && perms.update) void move(dragId, col); else { setDragId(null); setDragOver(null); } };

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>No conformidades</div>
          <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>M4 · Cláusula 10.1/10.2 — Tablero kanban {perms.update ? "· arrastra para mover entre estados" : ""}</div>
        </div>
        {perms.create && (
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({})} disabled={auditorias.length === 0}>Nueva NC</Button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <Kpi label="Abiertas" value={kpi.abiertas} sub={`${kpi.cerradas} cerradas`} />
        <Kpi label="Críticas" value={kpi.criticas} sub="acción urgente" tone={kpi.criticas > 0 ? "danger" : undefined} />
        <Kpi label="Por vencer (30d)" value={kpi.porVencer} sub="próximas a plazo" tone={kpi.porVencer > 0 ? "warn" : undefined} />
        <Kpi label="Total" value={items.length} sub="no conformidades" />
      </div>

      {auditorias.length === 0 && (
        <Card padding={16} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: theme.inkMuted, fontStyle: "italic" }}>No hay auditorías registradas. Las no conformidades nacen de una auditoría — crea una en el módulo Auditorías primero.</div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {COLS.map((col) => {
          const colItems = items.filter((i) => i.estado === col.id);
          const over = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={(e) => { if (dragId != null) { e.preventDefault(); setDragOver(col.id); } }}
              onDragLeave={() => setDragOver((c) => c === col.id ? null : c)}
              onDrop={(e) => onDrop(e, col.id)}
              style={{ borderRadius: theme.r.xl, background: over ? `${theme.accent}10` : "rgba(255,255,255,0.02)", border: `1.5px ${over ? "dashed" : "solid"} ${over ? theme.accent : theme.border}`, padding: 10, minHeight: 460, transition: "background .15s, border-color .15s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 10px" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.ink }}>{col.label}</div>
                  <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 1 }}>{col.sub}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: theme.accentSoft, color: theme.accentDeep, fontVariantNumeric: "tabular-nums" }}>{colItems.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colItems.map((it) => {
                  const overdue = it.estado !== "cerrada" && it.fecha_vencimiento && it.fecha_vencimiento < hoy;
                  return (
                    <div key={it.id} draggable={perms.update}
                      onDragStart={() => setDragId(it.id)} onDragEnd={() => { setDragId(null); setDragOver(null); }}
                      onClick={() => setModal({ data: it })}
                      style={{ padding: 12, borderRadius: theme.r.md, background: theme.surfaceSolid, border: `1px solid ${overdue ? theme.danger + "66" : theme.border}`, cursor: perms.update ? "grab" : "pointer", opacity: dragId === it.id ? 0.4 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10.5, fontFamily: "ui-monospace,monospace", color: theme.inkMuted }}>{it.codigo}</span>
                        <Badge tone={sevTone(it.severidad)}>{sevLabel(it.severidad)}</Badge>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: theme.ink, lineHeight: 1.4, marginBottom: 8 }}>{it.titulo}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: theme.inkMuted }}>
                        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10 }}>{it.auditoria_codigo}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: overdue ? theme.danger : theme.inkMuted, fontWeight: overdue ? 600 : 400 }}>
                          <Icon name="calendar" size={10} />{it.fecha_vencimiento ? it.fecha_vencimiento.slice(5) : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {colItems.length === 0 && <div style={{ fontSize: 11, color: theme.inkMuted, fontStyle: "italic", padding: "8px 6px" }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 12, textAlign: "center" }}>
        Tu rol: <strong style={{ color: theme.ink }}>{sessionRol}</strong> · clic en una tarjeta para ver/editar; al pasar a “Cerrada” se registra la fecha de cierre.
      </p>

      {modal && (
        <NcModal data={modal.data} auditorias={auditorias} perms={perms}
          onClose={() => setModal(null)}
          onSaved={(raw) => {
            const nc = mapServerNc(raw, auditorias);
            setItems((cur) => cur.some((i) => i.id === nc.id) ? cur.map((i) => i.id === nc.id ? nc : i) : [...cur, nc]);
            setModal(null);
          }}
          onDeleted={(id) => { setItems((cur) => cur.filter((i) => i.id !== id)); setModal(null); }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: number | string; sub: string; tone?: "danger" | "warn" }) {
  const color = tone === "danger" ? theme.danger : tone === "warn" ? theme.warn : theme.ink;
  return (
    <Card padding={16}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 4 }}>{sub}</div>
    </Card>
  );
}

function Pills({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const a = value === o;
        return <button key={o} type="button" onClick={() => onChange(o)} style={{ height: 28, padding: "0 12px", borderRadius: 999, border: `1px solid ${a ? theme.accent : theme.border}`, background: a ? theme.accent : "transparent", color: a ? "#fff" : theme.inkSoft, fontSize: 11.5, fontFamily: "inherit", cursor: "pointer" }}>{o}</button>;
      })}
    </div>
  );
}

function NcModal({ data, auditorias, perms, onClose, onSaved, onDeleted }: {
  data?: NC; auditorias: AudRef[]; perms: Perms;
  onClose: () => void; onSaved: (raw: Record<string, unknown>) => void; onDeleted: (id: number) => void;
}) {
  const edit = !!data;
  const readOnly = edit ? !perms.update : !perms.create;
  const [f, setF] = useState({
    auditoria_id: String(data?.auditoria_id ?? ""), titulo: data?.titulo ?? "", descripcion: data?.descripcion ?? "",
    causa_raiz: data?.causa_raiz ?? "", accion_correctiva: data?.accion_correctiva ?? "", severidad: data?.severidad ?? "menor",
    estado: data?.estado ?? "identificada",
    fecha_identificacion: data?.fecha_identificacion ?? new Date().toISOString().slice(0, 10),
    fecha_vencimiento: data?.fecha_vencimiento ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit && !f.auditoria_id) { setErr("Selecciona la auditoría origen"); return; }
    if (f.titulo.trim().length < 2) { setErr("El título es obligatorio"); return; }
    setSaving(true); setErr(null);
    try {
      const body = edit
        ? { titulo: f.titulo, descripcion: f.descripcion, causa_raiz: f.causa_raiz, accion_correctiva: f.accion_correctiva, severidad: f.severidad, estado: f.estado, fecha_vencimiento: f.fecha_vencimiento }
        : f;
      const res = await fetch(edit ? `/api/nc/${data!.id}` : "/api/nc", { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => ({}))) as { nc?: Record<string, unknown>; error?: string };
      if (!res.ok || !j.nc) { setErr(j.error ?? "Error"); return; }
      onSaved(j.nc);
    } catch { setErr("No se pudo conectar"); } finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm("¿Eliminar esta no conformidad?")) return;
    setSaving(true);
    try { const res = await fetch(`/api/nc/${data!.id}`, { method: "DELETE" }); if (res.ok) onDeleted(data!.id); else setErr("Error al eliminar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={720}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>{edit ? `${data!.codigo} — No conformidad` : "Nueva no conformidad"}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>{edit ? "Causa raíz, acción correctiva y seguimiento (cláusula 10.1/10.2)." : "El código se asigna automáticamente (NC-NNN)."}</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Auditoría origen</label>
            <select style={{ ...inputStyle, opacity: edit ? 0.6 : 1 }} value={f.auditoria_id} disabled={edit || readOnly} onChange={(e) => set("auditoria_id", e.target.value)}>
              <option value="" style={{ background: theme.surfaceSolid }}>Seleccionar…</option>
              {auditorias.map((a) => <option key={a.id} value={a.id} style={{ background: theme.surfaceSolid }}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Título</label><input style={inputStyle} value={f.titulo} disabled={readOnly} onChange={(e) => set("titulo", e.target.value)} /></div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Descripción</label><textarea style={textareaStyle} value={f.descripcion} disabled={readOnly} onChange={(e) => set("descripcion", e.target.value)} /></div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Causa raíz</label><textarea style={textareaStyle} value={f.causa_raiz} disabled={readOnly} onChange={(e) => set("causa_raiz", e.target.value)} placeholder="Análisis de causa (5 porqués, Ishikawa…)" /></div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Acción correctiva</label><textarea style={textareaStyle} value={f.accion_correctiva} disabled={readOnly} onChange={(e) => set("accion_correctiva", e.target.value)} placeholder="Acciones para eliminar la causa y evitar recurrencia" /></div>
          <div><label style={labelStyle}>Severidad</label><Pills value={f.severidad} options={SEVERIDAD} onChange={(v) => !readOnly && set("severidad", v)} /></div>
          <div><label style={labelStyle}>Estado</label><Pills value={f.estado} options={NC_ESTADOS_EDIT} onChange={(v) => !readOnly && set("estado", v)} /></div>
          {!edit && <div><label style={labelStyle}>Fecha de identificación</label><input style={inputStyle} type="date" value={f.fecha_identificacion} disabled={readOnly} onChange={(e) => set("fecha_identificacion", e.target.value)} /></div>}
          <div><label style={labelStyle}>Fecha de vencimiento</label><input style={inputStyle} type="date" value={f.fecha_vencimiento} disabled={readOnly} onChange={(e) => set("fecha_vencimiento", e.target.value)} /></div>
          {edit && data!.fecha_cierre && <div><label style={labelStyle}>Fecha de cierre</label><input style={{ ...inputStyle, opacity: 0.6 }} value={data!.fecha_cierre} disabled /></div>}
        </div>
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          {edit && perms.delete ? <Button variant="danger" size="sm" icon={<Icon name="trash" size={13} />} onClick={del} disabled={saving}>Eliminar</Button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>{readOnly ? "Cerrar" : "Cancelar"}</Button>
            {!readOnly && <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Guardar"}</Button>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ onClose, width = 640, children }: { onClose: () => void; width?: number; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(20,12,30,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }}>
        <Card padding={24}>{children}</Card>
      </div>
    </div>
  );
}
