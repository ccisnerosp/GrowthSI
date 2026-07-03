"use client";

import { useState, useMemo, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, theme } from "@/lib/ui";
import { RevisionDireccionTab, type Revision, type RevUsuario } from "./revision-direccion";

type Hallazgo = { id: number; auditoria_id: number; codigo: string; titulo: string; descripcion: string; severidad: string; estado: string };
type Auditoria = { id: number; codigo: string; nombre: string; tipo: string; alcance: string; fecha_inicio: string; fecha_fin: string; fecha_vencimiento: string; estado: string; hallazgos: Hallazgo[] };
type Perms = { aud_create: boolean; aud_update: boolean; aud_delete: boolean; hal_create: boolean; hal_update: boolean; hal_delete: boolean; rev_read: boolean; rev_create: boolean; rev_update: boolean; rev_approve: boolean; rev_delete: boolean };

const TIPOS = ["Interna", "Externa", "Tercero"];
const AUD_ESTADOS = ["planificada", "en-curso", "completada"];
const SEVERIDAD = ["menor", "mayor", "critica"];
const HAL_ESTADOS = ["abierto", "cerrado"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const audTone = (e: string): "success" | "warn" | "info" | "neutral" =>
  e === "completada" ? "success" : e === "en-curso" ? "warn" : e === "planificada" ? "info" : "neutral";
const audLabel = (e: string): string => ({ completada: "Completada", "en-curso": "En curso", planificada: "Planificada" } as Record<string, string>)[e] ?? e;
const tipoTone = (t: string): "accent" | "info" | "neutral" => t === "Externa" ? "accent" : t === "Tercero" ? "info" : "neutral";
const sevTone = (s: string): "danger" | "warn" | "info" | "neutral" => s === "critica" ? "danger" : s === "mayor" ? "warn" : s === "menor" ? "info" : "neutral";
const sevLabel = (s: string): string => ({ critica: "Crítica", mayor: "Mayor", menor: "Menor" } as Record<string, string>)[s] ?? s;

const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 12px", borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.25)", color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", minHeight: 64, lineHeight: 1.5 };
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: "block", marginBottom: 6 };
const today = () => new Date().toISOString().slice(0, 10);

const yOf = (s: string) => Number(s.slice(0, 4));
const mOf = (s: string) => Number(s.slice(5, 7));
const intersectsYear = (a: Auditoria, y: number) => yOf(a.fecha_inicio) <= y && yOf(a.fecha_fin) >= y;

export function AuditoriasClient({ sessionRol, anio, hoy, auditoriasInicial, revisionesInicial, usuarios, perms }: {
  sessionRol: string; anio: number; hoy: string; auditoriasInicial: Auditoria[]; revisionesInicial: Revision[]; usuarios: RevUsuario[]; perms: Perms;
}) {
  const router = useRouter();
  const auditorias = auditoriasInicial;
  const hallazgos = useMemo(() => auditorias.flatMap((a) => a.hallazgos), [auditorias]);
  const [tab, setTab] = useState<"auditorias" | "hallazgos" | "revision">("auditorias");
  const [selectedAud, setSelectedAud] = useState<number | null>(null);
  const [year, setYear] = useState(anio);
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "planificada" | "en-curso" | "completada">("todos");
  const [modal, setModal] = useState<null | { kind: "auditoria" | "hallazgo"; data?: Auditoria | Hallazgo; prefill?: string }>(null);

  const years = useMemo(() => {
    const ys = new Set<number>([anio]);
    for (const a of auditorias) { ys.add(yOf(a.fecha_inicio)); ys.add(yOf(a.fecha_fin)); }
    return [...ys].sort((x, y) => x - y);
  }, [auditorias, anio]);
  const minY = years[0], maxY = years[years.length - 1];
  const audsInYear = useMemo(() => auditorias.filter((a) => intersectsYear(a, year)), [auditorias, year]);
  const audsFiltradas = useMemo(() => estadoFiltro === "todos" ? audsInYear : audsInYear.filter((a) => a.estado === estadoFiltro), [audsInYear, estadoFiltro]);

  const kpi = {
    total: auditorias.length,
    abiertos: hallazgos.filter((h) => h.estado === "abierto").length,
    criticos: hallazgos.filter((h) => h.severidad === "critica" && h.estado === "abierto").length,
    completadas: auditorias.filter((a) => a.estado === "completada").length,
  };

  const visibleHallazgos = selectedAud ? hallazgos.filter((h) => h.auditoria_id === selectedAud) : hallazgos;
  const refresh = () => router.refresh();

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Programa de auditorías</div>
          <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>M4 · Cláusula 9.2 — Auditorías internas, externas y a terceros</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "auditorias" && perms.aud_create && (
            <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ kind: "auditoria" })}>Nueva auditoría</Button>
          )}
          {tab === "hallazgos" && perms.hal_create && (
            <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ kind: "hallazgo" })} disabled={auditorias.length === 0}>Nuevo hallazgo</Button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        <Kpi label="Auditorías" value={kpi.total} sub={`${anio}`} />
        <Kpi label="Hallazgos abiertos" value={kpi.abiertos} sub="pendientes de cierre" tone={kpi.abiertos > 0 ? "warn" : undefined} />
        <Kpi label="Hallazgos críticos" value={kpi.criticos} sub="acción urgente" tone={kpi.criticos > 0 ? "danger" : undefined} />
        <Kpi label="Completadas" value={kpi.completadas} sub="de auditorías" tone="success" />
      </div>

      <Card padding={0}>
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(0,0,0,0.30)", borderRadius: 10 }}>
            {([{ id: "auditorias", label: "Auditorías", count: auditorias.length }, { id: "hallazgos", label: "Hallazgos", count: hallazgos.length }, ...(perms.rev_read ? [{ id: "revision" as const, label: "Revisión por la dirección", count: revisionesInicial.length }] : [])] as Array<{ id: typeof tab; label: string; count: number }>).map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 30, padding: "0 14px", borderRadius: 7, border: "none", background: active ? theme.surfaceSolid : "transparent", color: active ? theme.ink : theme.inkMuted, fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t.label}<span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: active ? theme.accentSoft : "rgba(255,255,255,0.08)", color: active ? theme.accentDeep : theme.inkMuted }}>{t.count}</span>
                </button>
              );
            })}
          </div>
          {tab === "hallazgos" && (
            <>
              <div style={{ flex: 1 }} />
              <select value={selectedAud ?? ""} onChange={(e) => setSelectedAud(e.target.value ? Number(e.target.value) : null)}
                style={{ height: 30, padding: "0 10px", borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.25)", color: theme.ink, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                <option value="" style={{ background: theme.surfaceSolid }}>Todas las auditorías</option>
                {auditorias.map((a) => <option key={a.id} value={a.id} style={{ background: theme.surfaceSolid }}>{a.codigo} — {a.nombre}</option>)}
              </select>
            </>
          )}
        </div>

        {tab === "revision" ? (
          <RevisionDireccionTab revisiones={revisionesInicial} usuarios={usuarios} perms={perms} />
        ) : tab === "auditorias" ? (
          auditorias.length === 0 ? <Empty text="Sin auditorías. Crea la primera con “Nueva auditoría”." /> : (
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr" }}>
              <div>
                {/* Filtro por estado */}
                <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: theme.inkMuted, marginRight: 2 }}>Estado:</span>
                  {([{ id: "todos", label: "Todos" }, { id: "planificada", label: "Planificada" }, { id: "en-curso", label: "En curso" }, { id: "completada", label: "Completada" }] as Array<{ id: typeof estadoFiltro; label: string }>).map((c) => {
                    const active = estadoFiltro === c.id;
                    return <button key={c.id} onClick={() => setEstadoFiltro(c.id)} style={{ height: 26, padding: "0 10px", borderRadius: 999, border: `1px solid ${active ? theme.accent : theme.border}`, background: active ? theme.accent : "transparent", color: active ? "#fff" : theme.inkSoft, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>{c.label}</button>;
                  })}
                </div>
                {audsFiltradas.length === 0 ? <Empty text={`Sin auditorías${estadoFiltro !== "todos" ? ` (${audLabel(estadoFiltro)})` : ""} en ${year}.`} /> : audsFiltradas.map((a, i) => (
                  <div key={a.id} style={{ padding: 16, borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontFamily: "ui-monospace,monospace", color: theme.inkMuted }}>{a.codigo}</span>
                          <Badge tone={tipoTone(a.tipo)}>{a.tipo}</Badge>
                          {a.hallazgos.length > 0 && <Badge tone="warn">{a.hallazgos.length} hallazgos</Badge>}
                        </div>
                        <button onClick={() => { setTab("hallazgos"); setSelectedAud(a.id); }} style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: theme.ink, letterSpacing: "-0.01em" }}>{a.nombre}</button>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <Badge tone={audTone(a.estado)} dot>{audLabel(a.estado)}</Badge>
                        {perms.aud_update && <button onClick={() => setModal({ kind: "auditoria", data: a })} title="Editar" style={iconBtn}><Icon name="edit" size={14} /></button>}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, fontSize: 11.5, color: theme.inkSoft }}>
                      <Meta label="Alcance" value={a.alcance} mono />
                      <Meta label="Inicio" value={a.fecha_inicio} />
                      <Meta label="Fin" value={a.fecha_fin} />
                      <Meta label="Vencimiento" value={a.fecha_vencimiento} />
                    </div>
                  </div>
                ))}
              </div>
              <CalendarSidebar
                audsInYear={audsInYear} audsShown={audsFiltradas} year={year} onYear={setYear}
                minY={Math.min(minY, anio)} maxY={Math.max(maxY, anio)} anioActual={anio} hoy={hoy}
                canCreate={perms.aud_create}
                onOpen={(a) => setModal({ kind: "auditoria", data: a })}
                onQuickAdd={(fecha) => setModal({ kind: "auditoria", prefill: fecha })}
              />
            </div>
          )
        ) : (
          visibleHallazgos.length === 0 ? <Empty text="Sin hallazgos. Crea uno con “Nuevo hallazgo”." /> : (
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Código", "Auditoría", "Título", "Descripción", "Severidad", "Estado", ""].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleHallazgos.map((h) => {
                    const aud = auditorias.find((a) => a.id === h.auditoria_id);
                    return (
                      <tr key={h.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                        <td style={{ ...tdStyle, fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.inkMuted }}>{h.codigo}</td>
                        <td style={tdStyle}>{aud ? <Badge tone="neutral">{aud.codigo}</Badge> : "—"}</td>
                        <td style={{ ...tdStyle, color: theme.ink, fontWeight: 500, maxWidth: 220 }}>{h.titulo}</td>
                        <td style={{ ...tdStyle, color: theme.inkSoft, fontSize: 12, maxWidth: 320 }}>{h.descripcion}</td>
                        <td style={tdStyle}><Badge tone={sevTone(h.severidad)}>{sevLabel(h.severidad)}</Badge></td>
                        <td style={tdStyle}><Badge tone={h.estado === "cerrado" ? "success" : "warn"} dot>{h.estado}</Badge></td>
                        <td style={tdStyle}>{perms.hal_update && <button onClick={() => setModal({ kind: "hallazgo", data: h })} title="Editar" style={iconBtn}><Icon name="edit" size={14} /></button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 12, textAlign: "center" }}>
        Tu rol: <strong style={{ color: theme.ink }}>{sessionRol}</strong> · clic en el nombre de una auditoría para ver sus hallazgos.
      </p>

      {modal?.kind === "auditoria" && (
        <AuditoriaModal data={modal.data as Auditoria | undefined} prefill={modal.prefill} canDelete={perms.aud_delete} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {modal?.kind === "hallazgo" && (
        <HallazgoModal data={modal.data as Hallazgo | undefined} auditorias={auditorias} preselect={selectedAud} canDelete={perms.hal_delete} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
    </div>
  );
}

// ── Calendario vertical del programa de auditorías (con año, resumen, quick-add) ─
function YearBtn({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir === "prev" ? "Año anterior" : "Año siguiente"}
      style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: disabled ? theme.inkMuted : theme.ink, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
      <Icon name={dir === "prev" ? "chevL" : "chevR"} size={14} />
    </button>
  );
}

function CalendarSidebar({ audsInYear, audsShown, year, onYear, minY, maxY, anioActual, hoy, canCreate, onOpen, onQuickAdd }: {
  audsInYear: Auditoria[]; audsShown: Auditoria[]; year: number; onYear: (y: number) => void;
  minY: number; maxY: number; anioActual: number; hoy: string; canCreate: boolean;
  onOpen: (a: Auditoria) => void; onQuickAdd: (fecha: string) => void;
}) {
  const showToday = year === anioActual;
  const curMonth = mOf(hoy);
  const byEstado: Record<string, number> = { planificada: 0, "en-curso": 0, completada: 0 };
  const byTipo: Record<string, number> = { Interna: 0, Externa: 0, Tercero: 0 };
  for (const a of audsInYear) { byEstado[a.estado] = (byEstado[a.estado] ?? 0) + 1; byTipo[a.tipo] = (byTipo[a.tipo] ?? 0) + 1; }
  const monthAuds = (m: number) => audsShown.filter((a) => (yOf(a.fecha_inicio) < year ? 1 : mOf(a.fecha_inicio)) === m);

  return (
    <div style={{ borderLeft: `1px solid ${theme.border}`, padding: 16 }}>
      {/* Navegación de año */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <YearBtn dir="prev" disabled={year <= minY} onClick={() => onYear(year - 1)} />
        <span style={{ fontSize: 15, fontWeight: 700, color: theme.ink, fontVariantNumeric: "tabular-nums", minWidth: 48, textAlign: "center" }}>{year}</span>
        <YearBtn dir="next" disabled={year >= maxY} onClick={() => onYear(year + 1)} />
        {year !== anioActual && <Button variant="ghost" size="sm" onClick={() => onYear(anioActual)}>Hoy</Button>}
      </div>

      {/* Resumen del año */}
      <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: theme.inkMuted, marginBottom: 6 }}>Resumen {year}: <strong style={{ color: theme.ink }}>{audsInYear.length}</strong> auditoría(s)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Badge tone="info">Planif. {byEstado.planificada}</Badge>
          <Badge tone="warn">En curso {byEstado["en-curso"]}</Badge>
          <Badge tone="success">Compl. {byEstado.completada}</Badge>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          <Badge tone="neutral">Interna {byTipo.Interna}</Badge>
          <Badge tone="accent">Externa {byTipo.Externa}</Badge>
          <Badge tone="info">Tercero {byTipo.Tercero}</Badge>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Calendario</div>
      <div style={{ display: "grid", gap: 5 }}>
        {MESES.map((mLbl, i) => {
          const m = i + 1;
          const list = monthAuds(m);
          const isCur = showToday && m === curMonth;
          return (
            <div key={mLbl} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: theme.r.md, background: isCur ? `${theme.accent}14` : (list.length ? "rgba(255,255,255,0.03)" : "transparent"), border: `1px solid ${isCur ? theme.accent : (list.length ? theme.border : "transparent")}` }}>
              <span style={{ width: 30, fontSize: 11, fontWeight: 600, color: isCur ? theme.accentDeep : theme.inkMuted }}>{mLbl}</span>
              <div style={{ flex: 1, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {list.length ? list.map((a) => (
                  <button key={a.id} onClick={() => onOpen(a)} title={`${a.codigo} · ${a.nombre} — ${a.tipo}, ${audLabel(a.estado)}. ${a.fecha_inicio} → ${a.fecha_fin}`} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                    <Badge tone={tipoTone(a.tipo)}>{a.codigo.split("-").pop()}</Badge>
                  </button>
                )) : <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>}
              </div>
              {canCreate && (
                <button onClick={() => onQuickAdd(`${year}-${String(m).padStart(2, "0")}-01`)} title={`Nueva auditoría en ${mLbl} ${year}`}
                  style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${theme.border}`, background: "transparent", color: theme.inkMuted, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="plus" size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ color: theme.inkMuted, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: mono ? "ui-monospace,monospace" : undefined, fontSize: mono ? 11 : 11.5, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: mono ? "normal" : "nowrap" }}>{value || "—"}</div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: number | string; sub: string; tone?: "success" | "warn" | "danger" }) {
  const color = tone === "success" ? theme.success : tone === "warn" ? theme.warn : tone === "danger" ? theme.danger : theme.ink;
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

function Modal({ onClose, width = 640, children }: { onClose: () => void; width?: number; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(20,12,30,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }}>
        <Card padding={24}>{children}</Card>
      </div>
    </div>
  );
}
function ErrBox({ msg }: { msg: string }) {
  return <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{msg}</div>;
}

function AuditoriaModal({ data, prefill, canDelete, onClose, onSaved }: { data?: Auditoria; prefill?: string; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const edit = !!data;
  const base = prefill ?? today();
  const [f, setF] = useState({
    nombre: data?.nombre ?? "", tipo: data?.tipo ?? "Interna", alcance: data?.alcance ?? "",
    fecha_inicio: data?.fecha_inicio ?? base, fecha_fin: data?.fecha_fin ?? base,
    fecha_vencimiento: data?.fecha_vencimiento ?? base, estado: data?.estado ?? "planificada",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.nombre.trim().length < 2) { setErr("El nombre es obligatorio"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch(edit ? `/api/auditorias/${data!.id}` : "/api/auditorias", { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); } finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm("¿Eliminar esta auditoría?")) return;
    setSaving(true);
    try { const res = await fetch(`/api/auditorias/${data!.id}`, { method: "DELETE" }); if (res.ok) onSaved(); else setErr("Error al eliminar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>{edit ? `Editar ${data!.codigo}` : "Nueva auditoría"}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>{edit ? "Actualiza los datos de la auditoría." : "El código se asigna automáticamente (AU-AÑO-NN)."}</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Nombre</label><input style={inputStyle} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Auditoría interna anual del SGSI" /></div>
          <div><label style={labelStyle}>Tipo</label><Pills value={f.tipo} options={TIPOS} onChange={(v) => set("tipo", v)} /></div>
          <div><label style={labelStyle}>Estado</label><Pills value={f.estado} options={AUD_ESTADOS} onChange={(v) => set("estado", v)} /></div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Alcance</label><textarea style={textareaStyle} value={f.alcance} onChange={(e) => set("alcance", e.target.value)} placeholder="Controles o procesos auditados" /></div>
          <div><label style={labelStyle}>Fecha de inicio</label><input style={inputStyle} type="date" value={f.fecha_inicio} onChange={(e) => set("fecha_inicio", e.target.value)} /></div>
          <div><label style={labelStyle}>Fecha de fin</label><input style={inputStyle} type="date" value={f.fecha_fin} onChange={(e) => set("fecha_fin", e.target.value)} /></div>
          <div><label style={labelStyle}>Vencimiento del informe</label><input style={inputStyle} type="date" value={f.fecha_vencimiento} onChange={(e) => set("fecha_vencimiento", e.target.value)} /></div>
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

function HallazgoModal({ data, auditorias, preselect, canDelete, onClose, onSaved }: { data?: Hallazgo; auditorias: Auditoria[]; preselect: number | null; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const edit = !!data;
  const [f, setF] = useState({
    auditoria_id: String(data?.auditoria_id ?? preselect ?? ""), titulo: data?.titulo ?? "",
    descripcion: data?.descripcion ?? "", severidad: data?.severidad ?? "menor", estado: data?.estado ?? "abierto",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.auditoria_id) { setErr("Selecciona la auditoría"); return; }
    if (f.titulo.trim().length < 2) { setErr("El título es obligatorio"); return; }
    setSaving(true); setErr(null);
    try {
      // En edición no se cambia la auditoría padre.
      const body = edit ? { titulo: f.titulo, descripcion: f.descripcion, severidad: f.severidad, estado: f.estado } : f;
      const res = await fetch(edit ? `/api/hallazgos/${data!.id}` : "/api/hallazgos", { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); } finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm("¿Eliminar este hallazgo?")) return;
    setSaving(true);
    try { const res = await fetch(`/api/hallazgos/${data!.id}`, { method: "DELETE" }); if (res.ok) onSaved(); else setErr("Error al eliminar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>{edit ? `Editar ${data!.codigo}` : "Nuevo hallazgo"}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>{edit ? "Actualiza el hallazgo." : "El código se asigna automáticamente (HAL-NNN)."}</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Auditoría</label>
            <select style={{ ...inputStyle, opacity: edit ? 0.6 : 1 }} value={f.auditoria_id} disabled={edit} onChange={(e) => set("auditoria_id", e.target.value)}>
              <option value="" style={{ background: theme.surfaceSolid }}>Seleccionar…</option>
              {auditorias.map((a) => <option key={a.id} value={a.id} style={{ background: theme.surfaceSolid }}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Título</label><input style={inputStyle} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Título del hallazgo" /></div>
          <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Descripción</label><textarea style={textareaStyle} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} /></div>
          <div><label style={labelStyle}>Severidad</label><Pills value={f.severidad} options={SEVERIDAD} onChange={(v) => set("severidad", v)} /></div>
          <div><label style={labelStyle}>Estado</label><Pills value={f.estado} options={HAL_ESTADOS} onChange={(v) => set("estado", v)} /></div>
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

const thStyle: React.CSSProperties = { textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "12px 14px" };
const iconBtn: React.CSSProperties = { background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 4 };
function Empty({ text }: { text: string }) { return <div style={{ padding: 32, textAlign: "center", color: theme.inkMuted, fontStyle: "italic", fontSize: 13 }}>{text}</div>; }
