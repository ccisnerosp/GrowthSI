"use client";

import { useState, useMemo, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Field, Select, theme } from "@/lib/ui";
import { moduloRuta, type Cobertura } from "@/lib/obligatorios";

type DocListItem = {
  id: number; codigo: string; nombre: string; tipo: string; obligatorio: boolean; obligatorio_id: number | null;
  descripcion: string; version: string; estado: string;
  created_at: string | null; updated_at: string | null;
};
type Resumen = { total: number; cubiertos: number; faltantes: number; pct: number };
type Aprobacion = {
  id: number; codigo: string; tipo_entidad: string; entidad_id: number;
  comentario: string; estado: string;
  fecha_solicitud: string; fecha_respuesta: string | null; fecha_vencimiento: string;
};
type Perms = {
  create: boolean; update: boolean; delete: boolean;
  aprobacion_create: boolean; aprobacion_approve: boolean;
};

const TIPOS = ["Política", "Procedimiento", "Plan", "Instructivo", "Registro", "Manual", "Control"];

export const estadoLabel = (e: string): string =>
  e === "aprobado" ? "Aprobado" : e === "revision" ? "En revisión" : "Borrador";
export const estadoTone = (e: string): "success" | "warn" | "neutral" =>
  e === "aprobado" ? "success" : e === "revision" ? "warn" : "neutral";

export function DocumentosClient({
  sessionRol, documentosInicial, aprobacionesInicial, cobertura, resumen, perms,
}: { sessionRol: string; documentosInicial: DocListItem[]; aprobacionesInicial: Aprobacion[]; cobertura: Cobertura[]; resumen: Resumen; perms: Perms }) {
  const router = useRouter();
  const docs = documentosInicial;
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"docs" | "obligatorios">("docs");

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"todos" | "borrador" | "revision" | "aprobado">("todos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (estadoFilter !== "todos" && d.estado !== estadoFilter) return false;
      if (tipoFilter !== "todos" && d.tipo !== tipoFilter) return false;
      if (q && !(`${d.codigo} ${d.nombre} ${d.descripcion}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [docs, query, estadoFilter, tipoFilter]);

  const aprPorDoc = useMemo(() => {
    const m = new Map<number, Aprobacion[]>();
    for (const a of aprobacionesInicial) {
      const arr = m.get(a.entidad_id) ?? [];
      arr.push(a);
      m.set(a.entidad_id, arr);
    }
    return m;
  }, [aprobacionesInicial]);

  const kpi = {
    total: docs.length,
    aprobados: docs.filter((d) => d.estado === "aprobado").length,
    revision: docs.filter((d) => d.estado === "revision").length,
    obligatorios: docs.filter((d) => d.obligatorio).length,
  };

  const estadoChips: Array<{ id: typeof estadoFilter; label: string }> = [
    { id: "todos", label: "Todos" },
    { id: "borrador", label: "Borrador" },
    { id: "revision", label: "En revisión" },
    { id: "aprobado", label: "Aprobado" },
  ];

  const abrir = (id: number) => router.push(`/documentos/${id}`);

  const [borrando, setBorrando] = useState<number | null>(null);
  const borrar = async (d: DocListItem) => {
    if (!confirm(`¿Eliminar el documento "${d.codigo} · ${d.nombre}"?\n\nSe archiva (soft-delete): conserva su historial pero deja de estar disponible.`)) return;
    setBorrando(d.id);
    try {
      const res = await fetch(`/api/documentos/${d.id}`, { method: "DELETE" });
      if (!res.ok) { alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "No se pudo eliminar."); return; }
      router.refresh();
    } finally { setBorrando(null); }
  };

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Documentos del SGSI</div>
          <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>M2 · Cláusula 7.5 — Información documentada</div>
        </div>
        {perms.create && tab === "docs" && (
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setCreateOpen(true)}>
            Nuevo documento
          </Button>
        )}
      </div>

      {/* Pestañas: lista de documentos | catálogo de obligatorios */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(0,0,0,0.30)", borderRadius: 12, marginBottom: 14, width: "fit-content" }}>
        {([{ id: "docs", label: "Documentos", count: docs.length }, { id: "obligatorios", label: "Obligatorios ISO 27001", count: resumen.total }] as Array<{ id: typeof tab; label: string; count: number }>).map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "none", background: active ? theme.surfaceSolid : "transparent", color: active ? theme.ink : theme.inkMuted, fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t.label}
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: active ? theme.accentSoft : "rgba(255,255,255,0.08)", color: active ? theme.accentDeep : theme.inkMuted }}>{t.id === "obligatorios" ? `${resumen.cubiertos}/${resumen.total}` : t.count}</span>
            </button>
          );
        })}
      </div>

      {tab === "obligatorios" ? (
        <ObligatoriosPanel cobertura={cobertura} resumen={resumen} documentos={docs} canUpdate={perms.update} onChanged={() => router.refresh()} onAbrir={abrir} />
      ) : (
      <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        <Kpi label="Total" value={kpi.total} />
        <Kpi label="Aprobados" value={kpi.aprobados} tone="success" />
        <Kpi label="En revisión" value={kpi.revision} tone="warn" />
        <Kpi label="Obligatorios" value={kpi.obligatorios} />
      </div>

      <Card padding={12}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
              <Icon name="search" size={13} color={theme.inkMuted} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, nombre o descripción…"
              style={{ width: "100%", height: 34, padding: "0 12px 0 30px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(0,0,0,0.30)", borderRadius: 10 }}>
            {estadoChips.map((c) => {
              const active = estadoFilter === c.id;
              return (
                <button key={c.id} onClick={() => setEstadoFilter(c.id)} style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "none", background: active ? theme.surfaceSolid : "transparent", color: active ? theme.ink : theme.inkMuted, fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            style={{ height: 34, padding: "0 10px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
          >
            <option value="todos" style={{ background: theme.surfaceSolid }}>Todos los tipos</option>
            {TIPOS.map((t) => <option key={t} value={t} style={{ background: theme.surfaceSolid }}>{t}</option>)}
          </select>
        </div>
      </Card>

      <Card padding={0} style={{ marginTop: 12 }}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Código", "Nombre", "Tipo", "Obligatorio", "Versión", "Estado", "Aprobación", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: theme.inkMuted, fontStyle: "italic" }}>
                  {docs.length === 0 ? "Sin documentos. Crea el primero o genera uno con IA." : "Ningún documento coincide con los filtros."}
                </td></tr>
              )}
              {filtered.map((d) => {
                const apr = aprPorDoc.get(d.id) ?? [];
                const pendiente = apr.some((a) => a.estado === "pendiente");
                return (
                <tr key={d.id}
                  style={{ borderTop: `1px solid ${theme.border}`, cursor: "pointer" }}
                  onClick={() => abrir(d.id)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td style={{ padding: "12px 14px", fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.inkMuted }}>{d.codigo}</td>
                  <td style={{ padding: "12px 14px", color: theme.ink, fontWeight: 500 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Icon name="doc" size={14} color={theme.accent} />{d.nombre}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: theme.inkSoft }}>{d.tipo}</td>
                  <td style={{ padding: "12px 14px" }}>{d.obligatorio ? <Badge tone="warn" dot>Sí</Badge> : <Badge tone="neutral">No</Badge>}</td>
                  <td style={{ padding: "12px 14px", color: theme.inkSoft, fontVariantNumeric: "tabular-nums" }}>{d.version}</td>
                  <td style={{ padding: "12px 14px" }}><Badge tone={estadoTone(d.estado)} dot>{estadoLabel(d.estado)}</Badge></td>
                  <td style={{ padding: "12px 14px" }}>
                    {pendiente ? <Badge tone="warn" dot>1 pendiente</Badge> : apr.length > 0 ? <Badge tone="info">{apr.length} histórico</Badge> : <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap", textAlign: "right" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {perms.delete && (
                        <button
                          title="Eliminar documento"
                          disabled={borrando === d.id}
                          onClick={(e) => { e.stopPropagation(); void borrar(d); }}
                          style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: borrando === d.id ? "default" : "pointer", padding: 4, display: "inline-flex", opacity: borrando === d.id ? 0.5 : 1 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = theme.danger; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = theme.inkMuted; }}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                      <Icon name="chevR" size={14} color={theme.inkMuted} />
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 12, textAlign: "center" }}>
        Tu rol: <strong style={{ color: theme.ink }}>{sessionRol}</strong> · clic en un documento para abrir su página: ver/editar contenido, evidencias y aprobación.
      </p>
      </>
      )}

      {createOpen && (
        <CreateModal onClose={() => setCreateOpen(false)} onSaved={(id) => { setCreateOpen(false); abrir(id); }} />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" }) {
  const color = tone === "success" ? theme.success : tone === "warn" ? theme.warn : theme.ink;
  return (
    <Card padding={16}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </Card>
  );
}

// ── Catálogo de información documentada obligatoria (ISO 27001) ───────────
const MODULO_LABEL: Record<string, string> = { alcance: "Alcance", soa: "SoA", objetivos: "Objetivos", auditorias: "Auditorías", nc: "No Conformidades", riesgos: "Riesgos", documentos: "Documentos" };

function ObligatoriosPanel({ cobertura, resumen, documentos, canUpdate, onChanged, onAbrir }: {
  cobertura: Cobertura[]; resumen: Resumen; documentos: DocListItem[]; canUpdate: boolean; onChanged: () => void; onAbrir: (id: number) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  // Documentos ya vinculados a OTRO ítem → no ofrecerlos para reasignar por error.
  const link = async (itemId: number, targetDocId: number | null, prevDocId: number | null) => {
    if (targetDocId === prevDocId) return;
    setBusy(itemId);
    try {
      if (prevDocId && prevDocId !== targetDocId) {
        await fetch(`/api/documentos/${prevDocId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ obligatorio_id: null }) });
      }
      if (targetDocId) {
        const res = await fetch(`/api/documentos/${targetDocId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ obligatorio_id: itemId }) });
        if (!res.ok) { alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); }
      }
      onChanged();
    } finally { setBusy(null); }
  };

  return (
    <div>
      {/* Resumen de cobertura */}
      <Card padding={18} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Información documentada obligatoria · ISO/IEC 27001:2022</div>
            <div style={{ fontSize: 11.5, color: theme.inkMuted, marginTop: 2 }}>{resumen.cubiertos} de {resumen.total} cubiertos · {resumen.faltantes} faltante(s)</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: resumen.pct >= 80 ? theme.success : resumen.pct >= 50 ? theme.warn : theme.danger, fontVariantNumeric: "tabular-nums" }}>{resumen.pct}%</div>
        </div>
        <div style={{ height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${resumen.pct}%`, height: "100%", background: theme.accent, borderRadius: 999 }} />
        </div>
      </Card>

      <Card padding={0}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Cláusula", "Información documentada", "Tipo", "Cobertura", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cobertura.map((c) => {
                const esDoc = c.item.modulo === "documentos";
                return (
                  <tr key={c.item.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                    <td style={{ padding: "11px 14px", fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.accentDeep, fontWeight: 600, whiteSpace: "nowrap" }}>{c.item.clausula}</td>
                    <td style={{ padding: "11px 14px", maxWidth: 300 }}>
                      <div style={{ color: theme.ink, fontWeight: 500 }}>{c.item.nombre}</div>
                      <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 2, lineHeight: 1.4 }}>{c.item.descripcion}</div>
                    </td>
                    <td style={{ padding: "11px 14px" }}><Badge tone={c.item.tipo === "Documento" ? "accent" : "info"}>{c.item.tipo}</Badge></td>
                    <td style={{ padding: "11px 14px" }}>
                      {c.cubierto ? (
                        c.via === "documento" && c.documento ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <Badge tone="success" dot>Cubierto</Badge>
                            <button onClick={() => onAbrir(c.documento!.id)} style={{ background: "transparent", border: "none", color: theme.accentDeep, cursor: "pointer", fontFamily: "ui-monospace,monospace", fontSize: 11, textDecoration: "underline", padding: 0 }}>{c.documento.codigo}</button>
                            <Badge tone={estadoTone(c.documento.estado)}>{estadoLabel(c.documento.estado)}</Badge>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Badge tone="success" dot>Cubierto</Badge>
                            <span style={{ fontSize: 11, color: theme.inkMuted }}>gestionado en {MODULO_LABEL[c.item.modulo]}</span>
                          </span>
                        )
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Badge tone="danger" dot>Faltante</Badge>
                          {!esDoc && <a href={moduloRuta(c.item.modulo)} style={{ fontSize: 11, color: theme.accentDeep, textDecoration: "underline" }}>ir a {MODULO_LABEL[c.item.modulo]}</a>}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      {esDoc && canUpdate ? (
                        <select disabled={busy === c.item.id} value={c.documento?.id ?? ""}
                          onChange={(e) => link(c.item.id, e.target.value ? Number(e.target.value) : null, c.documento?.id ?? null)}
                          style={{ height: 30, padding: "0 8px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 11.5, fontFamily: "inherit", maxWidth: 220 }}>
                          <option value="" style={{ background: theme.surfaceSolid }}>— Sin vincular —</option>
                          {documentos.map((dd) => <option key={dd.id} value={dd.id} style={{ background: theme.surfaceSolid }}>{dd.codigo} · {dd.nombre}</option>)}
                        </select>
                      ) : esDoc ? <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span> : (
                        <button onClick={() => router.push(moduloRuta(c.item.modulo))} title={`Ir a ${MODULO_LABEL[c.item.modulo]}`} style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 4 }}><Icon name="arrowR" size={14} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 12, textAlign: "center" }}>
        Vincula un documento del tenant a cada ítem de tipo <strong style={{ color: theme.ink }}>Documento</strong>; los <strong style={{ color: theme.ink }}>Registros</strong> automáticos se cubren desde su módulo (Riesgos, SoA, Auditorías, NC…).
      </p>
    </div>
  );
}

// ── HU20 — Registrar documento ───────────────────────────────────────────
function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState({ nombre: "", tipo: "Política", descripcion: "", version: "1.0", obligatorio: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const res = await fetch("/api/documentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const body = (await res.json().catch(() => ({}))) as { documento?: { id: number }; error?: string; issues?: Array<{ path: string; message: string }> };
      if (!res.ok) {
        if (body.issues) { const m: Record<string, string> = {}; for (const i of body.issues) m[i.path] = i.message; setFieldErrs(m); }
        setErr(body.error ?? "Error"); return;
      }
      onSaved(body.documento!.id);
    } catch { setErr("No se pudo conectar al servidor"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={560}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nuevo documento</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>El código se asigna automáticamente según el tipo. El contenido lo redactas después.</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Nombre" required value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} error={fieldErrs.nombre} placeholder="Política de Seguridad de la Información" />
          </div>
          <Select label="Tipo" required value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} options={TIPOS} />
          <Field label="Versión" value={f.version} onChange={(v) => setF({ ...f, version: v })} />
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Descripción *</span>
              <textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} rows={3}
                style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${fieldErrs.descripcion ? theme.danger : theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 64 }} />
              {fieldErrs.descripcion && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.descripcion}</span>}
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "span 2", fontSize: 13, color: theme.inkSoft }}>
            <input type="checkbox" checked={f.obligatorio} onChange={(e) => setF({ ...f, obligatorio: e.target.checked })} style={{ accentColor: theme.accent, width: 16, height: 16 }} />
            Documento obligatorio del SGSI
          </label>
        </div>
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Creando…" : "Crear"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ onClose, width = 560, children }: { onClose: () => void; width?: number; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(20,12,30,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width }}>
        <Card padding={24}>{children}</Card>
      </div>
    </div>
  );
}
