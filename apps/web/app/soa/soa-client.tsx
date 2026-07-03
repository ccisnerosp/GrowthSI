"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, theme } from "@/lib/ui";
import { exportToWord, exportToPdf } from "@/lib/export-doc";
import { artefactoEsperado } from "@/lib/control-artefactos";

// ── Tipos (espejo del payload de page.tsx) ────────────────────────────────
type Control = { id: number; codigo: string; nombre: string; dominio: string; descripcion: string };
type DocRef = { id: number; codigo: string; nombre: string };
type RolLite = { id: number; codigo: string; nombre: string };
type UsuarioLite = { id: number; nombre: string; rol: string };
type Actividad = { id: number; descripcion: string; estado: string; fecha_objetivo: string | null; responsable_usuario_id: number | null; responsable_nombre: string | null };
type Soa = {
  id: number; aplica: boolean; estado: string;
  justificacion: string; evidencia: string; observaciones: string;
  fecha_revision: string; origen: string; justificacion_ia: string | null;
  evidencia_documento_id: number | null; evidencia_documento: DocRef | null;
  rol_sgsi_id: number | null; responsable_usuario_id: number | null;
  rol_sgsi: { codigo: string; nombre: string } | null; responsable: { nombre: string } | null;
};
type SoaItem = { control: Control; soa: Soa | null; riesgos: string[]; actividades: Actividad[] };
type RiesgoSinCobertura = { codigo: string; nombre: string };
type Perms = { create: boolean; update: boolean; delete: boolean };

const DOMINIOS = ["Organizacional", "Personas", "Físico", "Tecnológico"] as const;
const TEMA: Record<string, string> = { Organizacional: "A.5", Personas: "A.6", Físico: "A.7", Tecnológico: "A.8" };

const ESTADOS_EDIT = ["no_iniciado", "planificado", "parcial", "implementado", "no_aplica"];
const estadoLabel = (e: string): string =>
  ({ generado: "Generado", no_iniciado: "No iniciado", planificado: "Planificado", parcial: "Parcial", implementado: "Implementado", no_aplica: "No aplica" } as Record<string, string>)[e] ?? e;
const estadoTone = (e: string): "accent" | "success" | "warn" | "info" | "neutral" =>
  e === "generado" ? "accent" : e === "implementado" ? "success" : e === "parcial" ? "warn" : e === "planificado" ? "info" : "neutral";

const effEstado = (it: SoaItem): string => it.soa?.estado ?? "no_iniciado";
// 'Aplica' parte en No: un control solo aplica si el contexto lo justifica (IA o manual).
const effAplica = (it: SoaItem): boolean => it.soa?.aplica ?? false;

const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 12px", borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.25)", color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", minHeight: 70, lineHeight: 1.5 };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 8 };

export function SoaClient({ sessionRol, orgNombre, controlesInicial, documentos, riesgosSinCobertura, roles, usuarios, perms }: {
  sessionRol: string; orgNombre: string; controlesInicial: SoaItem[]; documentos: DocRef[]; riesgosSinCobertura: RiesgoSinCobertura[]; roles: RolLite[]; usuarios: UsuarioLite[]; perms: Perms;
}) {
  const router = useRouter();
  const items = controlesInicial;
  const [filtro, setFiltro] = useState<"all" | (typeof DOMINIOS)[number]>("all");
  const [editId, setEditId] = useState<number | null>(null);
  const [sugiriendo, setSugiriendo] = useState(false);
  const [generandoEv, setGenerandoEv] = useState(false);
  const [progress, setProgress] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Controles que aplican, revisados y SIN documento de evidencia.
  const faltantesEvidencia = items.filter((i) => effAplica(i) && effEstado(i) !== "generado" && !i.soa?.evidencia_documento_id);

  const generarEvidencias = async () => {
    if (faltantesEvidencia.length === 0) return;
    if (!confirm(`Se generará un documento de evidencia (tipo Control, vía IA con ISO 27002) para ${faltantesEvidencia.length} control(es) que aplican sin evidencia. ¿Continuar?`)) return;
    setGenerandoEv(true); setMsg(null);
    let ok = 0;
    try {
      for (let k = 0; k < faltantesEvidencia.length; k++) {
        const it = faltantesEvidencia[k];
        setProgress(`Generando ${k + 1}/${faltantesEvidencia.length} — ${it.control.codigo}…`);
        const res = await fetch("/api/ia/generar-evidencia-control", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ control_anexo_a_id: it.control.id }),
        });
        if (res.ok) ok++;
        else { setMsg({ kind: "err", text: (await res.json().catch(() => ({})) as { error?: string }).error ?? "Error al generar una evidencia" }); break; }
      }
      if (ok > 0) setMsg({ kind: "ok", text: `Se generaron ${ok} documento(s) de evidencia (tipo Control) y se enlazaron a sus controles.` });
      router.refresh();
    } catch { setMsg({ kind: "err", text: "No se pudo conectar al servicio IA" }); }
    finally { setGenerandoEv(false); setProgress(""); }
  };

  const stats = useMemo(() => ({
    total: items.length,
    aplican: items.filter((i) => effAplica(i) && effEstado(i) !== "no_aplica").length,
    implementados: items.filter((i) => effEstado(i) === "implementado").length,
    parciales: items.filter((i) => effEstado(i) === "parcial").length,
    planificados: items.filter((i) => effEstado(i) === "planificado").length,
    noAplica: items.filter((i) => effEstado(i) === "no_aplica").length,
    generados: items.filter((i) => effEstado(i) === "generado").length,
  }), [items]);

  const filtered = filtro === "all" ? items : items.filter((i) => i.control.dominio === filtro);
  const editItem = editId != null ? items.find((i) => i.control.id === editId) ?? null : null;

  const sugerir = async () => {
    setSugiriendo(true); setMsg(null);
    try {
      const res = await fetch("/api/ia/sugerir-controles", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { creados?: number; enlazados?: number; reevaluar?: number; sugeridos?: number; error?: string };
      if (!res.ok) { setMsg({ kind: "err", text: body.error ?? `Error ${res.status}` }); return; }
      const partes = [`${body.creados ?? 0} control(es) nuevo(s) por revisar`];
      if (body.enlazados) partes.push(`${body.enlazados} riesgo(s) enlazado(s) a ${body.reevaluar ?? 0} control(es) existente(s) → marcado(s) para reevaluación`);
      setMsg({ kind: "ok", text: `IA cubrió las brechas: ${partes.join("; ")}.` });
      router.refresh();
    } catch { setMsg({ kind: "err", text: "No se pudo conectar al servicio IA" }); }
    finally { setSugiriendo(false); }
  };

  const exportar = (fmt: "word" | "pdf") => {
    const doc = { codigo: "SOA", nombre: "Declaración de Aplicabilidad (SoA)", tipo: "Registro", version: "1.0", estado: "vigente", contenido: buildSoaHtml(items, orgNombre) };
    (fmt === "word" ? exportToWord : exportToPdf)(doc);
  };

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Controles</div>
          <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>M3 · Declaración de Aplicabilidad (SoA) — 93 controles del Anexo A ISO/IEC 27001:2022 (cláusula 6.1.3.d)</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<Icon name="doc" size={12} />} onClick={() => exportar("word")}>Word</Button>
          <Button variant="ghost" size="sm" icon={<Icon name="download" size={12} />} onClick={() => exportar("pdf")}>PDF</Button>
          {perms.update && faltantesEvidencia.length > 0 && (
            <Button variant="soft" size="sm" icon={<Icon name="doc" size={13} />} onClick={generarEvidencias} disabled={generandoEv}>
              {generandoEv ? (progress || "Generando…") : `Generar evidencias faltantes (${faltantesEvidencia.length})`}
            </Button>
          )}
          {perms.create && (
            <Button variant="ai" size="sm" icon={<Icon name="sparkle" size={13} />} onClick={sugerir} disabled={sugiriendo}>
              {sugiriendo ? "Sugiriendo…" : "Sugerir controles con IA"}
            </Button>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: theme.r.md, fontSize: 12, background: msg.kind === "ok" ? "rgba(52,211,153,0.10)" : "rgba(248,113,113,0.10)", border: `1px solid ${msg.kind === "ok" ? theme.success : theme.danger}40`, color: msg.kind === "ok" ? theme.success : theme.danger }}>{msg.text}</div>
      )}

      {/* Detección de brechas de cobertura: riesgos 'mitigar' sin control (ISO 8.3 / 6.1.3). */}
      {riesgosSinCobertura.length > 0 && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: theme.r.md, background: "rgba(251,191,36,0.08)", border: `1px solid ${theme.warn}40` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.warn, fontSize: 12.5, fontWeight: 600 }}>
              <Icon name="alert" size={14} />
              {riesgosSinCobertura.length} riesgo(s) «mitigar» sin control asignado
            </div>
            {perms.create && (
              <Button variant="soft" size="sm" icon={<Icon name="sparkle" size={12} />} onClick={sugerir} disabled={sugiriendo}>
                {sugiriendo ? "Sugiriendo…" : "Cubrir brechas con IA"}
              </Button>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
            {riesgosSinCobertura.map((r) => (
              <Badge key={r.codigo} tone="warn"><span title={r.nombre} style={{ fontFamily: "ui-monospace,monospace", fontSize: 10.5 }}>{r.codigo}</span></Badge>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 8 }}>
            El sugeridor enlazará cada riesgo a un control existente cuando aplique (marcándolo para reevaluación) o propondrá uno nuevo del Anexo A.
          </div>
        </div>
      )}

      {/* Tarjetas por tema */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        {DOMINIOS.map((dom) => {
          const tItems = items.filter((i) => i.control.dominio === dom);
          const impl = tItems.filter((i) => effEstado(i) === "implementado").length;
          const pct = Math.round((impl / Math.max(1, tItems.length)) * 100);
          const active = filtro === dom;
          return (
            <Card key={dom} padding={16} hover onClick={() => setFiltro(active ? "all" : dom)} style={{ cursor: "pointer", borderColor: active ? theme.accent : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, fontFamily: "ui-monospace,monospace" }}>{TEMA[dom]}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink, marginTop: 2 }}>{dom}</div>
                </div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.accentDeep }}>{tItems.length}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: theme.inkMuted }}>Implementación</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: theme.accent, borderRadius: 999 }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Stats */}
      <Card padding={14} style={{ marginBottom: 12, display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        {[
          { l: "Total", v: stats.total, c: theme.ink },
          { l: "Aplican", v: stats.aplican, c: theme.accent },
          { l: "Implementados", v: stats.implementados, c: theme.success },
          { l: "Parciales", v: stats.parciales, c: theme.warn },
          { l: "Planificados", v: stats.planificados, c: theme.info },
          { l: "No aplica", v: stats.noAplica, c: theme.inkMuted },
          { l: "Generados IA", v: stats.generados, c: theme.accentDeep },
        ].map((s) => (
          <div key={s.l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.c, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: theme.inkMuted, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </Card>

      <Card padding={0}>
        {/* Tabs */}
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}`, display: "flex", gap: 4 }}>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(0,0,0,0.30)", borderRadius: 10, flexWrap: "wrap" }}>
            {(["all", ...DOMINIOS] as Array<"all" | (typeof DOMINIOS)[number]>).map((t) => {
              const active = filtro === t;
              const count = t === "all" ? items.length : items.filter((i) => i.control.dominio === t).length;
              return (
                <button key={t} onClick={() => setFiltro(t)} style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "none", background: active ? theme.surfaceSolid : "transparent", color: active ? theme.ink : theme.inkMuted, fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t === "all" ? "Todos" : `${TEMA[t]} · ${t}`}
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: active ? theme.accentSoft : "rgba(255,255,255,0.08)", color: active ? theme.accentDeep : theme.inkMuted }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla */}
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Control", "Nombre", "Aplica", "Estado", "Riesgos", "Evidencia", "F. Revisión", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 12px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const estado = effEstado(it);
                const isGen = estado === "generado";
                return (
                  <tr key={it.control.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: perms.update ? "pointer" : "default" }}
                    onClick={() => perms.update && setEditId(it.control.id)}>
                    <td style={{ padding: "11px 12px", fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.accentDeep, fontWeight: 600 }}>{it.control.codigo}</td>
                    <td style={{ padding: "11px 12px", color: theme.ink, fontWeight: 500, maxWidth: 240 }}>{it.control.nombre}</td>
                    <td style={{ padding: "11px 12px" }}><Badge tone={effAplica(it) ? "success" : "neutral"} dot>{effAplica(it) ? "Sí" : "No"}</Badge></td>
                    <td style={{ padding: "11px 12px" }}><Badge tone={estadoTone(estado)} dot>{estadoLabel(estado)}</Badge></td>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {it.riesgos.length === 0 ? <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>
                          : it.riesgos.map((rc) => <Badge key={rc} tone="info">{rc}</Badge>)}
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px" }}>
                      {it.soa?.evidencia_documento
                        ? <Badge tone="success" dot><span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10.5 }}>{it.soa.evidencia_documento.codigo}</span></Badge>
                        : <Badge tone="neutral">Sin evidencia</Badge>}
                    </td>
                    <td style={{ padding: "11px 12px", color: theme.inkSoft, fontVariantNumeric: "tabular-nums", fontSize: 11.5 }}>{it.soa?.fecha_revision ?? "—"}</td>
                    <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {isGen && perms.update ? (
                        <AcceptDiscard controlId={it.control.id} onChanged={() => router.refresh()} />
                      ) : perms.update ? (
                        <button onClick={() => setEditId(it.control.id)} title="Editar" style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 4 }}><Icon name="edit" size={14} /></button>
                      ) : <span style={{ color: theme.inkMuted }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 12, textAlign: "center" }}>
        Tu rol: <strong style={{ color: theme.ink }}>{sessionRol}</strong> · los controles sugeridos por IA nacen como <Badge tone="accent">Generado</Badge> y requieren tu revisión. Clic en una fila para editar la declaración del control.
      </p>

      {editItem && perms.update && (
        <EditPanel key={editItem.control.id} item={editItem} documentos={documentos} roles={roles} usuarios={usuarios} onClose={() => setEditId(null)} onChanged={() => router.refresh()} />
      )}
    </div>
  );
}

// ── Aceptar / descartar (controles generados por IA) ──────────────────────
function AcceptDiscard({ controlId, onChanged }: { controlId: number; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (accion: "aceptar" | "descartar") => {
    // Confirmación final antes de una acción irreversible sobre un control sugerido.
    const mensaje = accion === "aceptar"
      ? "¿Aceptar este control sugerido? Quedará incorporado a la Declaración de Aplicabilidad (SoA) como aplicable (estado «Planificado»), conservando sus enlaces a los riesgos asociados."
      : "¿Descartar este control sugerido? Se quitará de la SoA junto con sus enlaces a riesgos.";
    if (!confirm(mensaje)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/control-soa/${controlId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion }) });
      if (res.ok) onChanged();
      else alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error");
    } finally { setBusy(false); }
  };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <Button variant="primary" size="sm" disabled={busy} icon={<Icon name="check" size={12} />} onClick={() => act("aceptar")}>Aceptar</Button>
      <Button variant="danger" size="sm" disabled={busy} icon={<Icon name="x" size={12} />} onClick={() => act("descartar")}>Descartar</Button>
    </div>
  );
}

// ── Panel de edición de la declaración del control ────────────────────────
function EditPanel({ item, documentos, roles, usuarios, onClose, onChanged }: { item: SoaItem; documentos: DocRef[]; roles: RolLite[]; usuarios: UsuarioLite[]; onClose: () => void; onChanged: () => void }) {
  const isGen = effEstado(item) === "generado";
  const [aplica, setAplica] = useState(effAplica(item));
  const [estado, setEstado] = useState(isGen ? "planificado" : effEstado(item));
  const [justificacion, setJustificacion] = useState(item.soa?.justificacion ?? "");
  const [evidencia, setEvidencia] = useState(item.soa?.evidencia ?? "");
  const [evidenciaDocId, setEvidenciaDocId] = useState<number | null>(item.soa?.evidencia_documento_id ?? null);
  const [rolId, setRolId] = useState<number | null>(item.soa?.rol_sgsi_id ?? null);
  const [responsableId, setResponsableId] = useState<number | null>(item.soa?.responsable_usuario_id ?? null);
  const [observaciones, setObservaciones] = useState(item.soa?.observaciones ?? "");
  const [fechaRev, setFechaRev] = useState(item.soa?.fecha_revision ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [genEv, setGenEv] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const artefacto = artefactoEsperado(item.control.codigo);

  // Puede generar evidencia IA si el control YA está guardado como aplicable, revisado y sin documento.
  const puedeGenerarEvidencia = effAplica(item) && !item.soa?.evidencia_documento_id && !isGen;

  const generarEvidencia = async () => {
    setGenEv(true); setErr(null);
    try {
      const res = await fetch("/api/ia/generar-evidencia-control", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ control_anexo_a_id: item.control.id }),
      });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error al generar la evidencia"); return; }
      onChanged(); onClose();
    } catch { setErr("No se pudo conectar al servicio IA"); }
    finally { setGenEv(false); }
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/control-soa/${item.control.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aplica, estado, justificacion, evidencia, evidencia_documento_id: evidenciaDocId, observaciones, fecha_revision: fechaRev, rol_sgsi_id: rolId, responsable_usuario_id: responsableId }),
      });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onChanged(); onClose();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,12,30,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 560, maxWidth: "96%", background: theme.surfaceSolid, borderLeft: `1px solid ${theme.borderStrong}`, boxShadow: "-12px 0 40px rgba(20,12,30,0.45)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink }}>{item.control.nombre}</div>
            <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 3, display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "ui-monospace,monospace", color: theme.accentDeep }}>{item.control.codigo}</span> · {item.control.dominio}
              {isGen && <Badge tone="accent" dot>Generado por IA</Badge>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <form onSubmit={guardar} style={{ flex: 1, overflow: "auto", padding: 20, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12, color: theme.inkSoft, lineHeight: 1.5 }}>{item.control.descripcion}</div>

          {/* #3 — Artefacto esperado (catálogo determinista, sin IA). */}
          <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="doc" size={15} color={theme.accent} />
            <div>
              <div style={{ fontSize: 11.5, color: theme.ink }}>Artefacto esperado: <strong>{artefacto.tipo}</strong></div>
              <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 2, lineHeight: 1.4 }}>{artefacto.descripcion}</div>
            </div>
          </div>

          {item.riesgos.length > 0 && (
            <div>
              <label style={labelStyle}>Riesgos que trata</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{item.riesgos.map((rc) => <Badge key={rc} tone="info">{rc}</Badge>)}</div>
            </div>
          )}

          {isGen && item.soa?.justificacion_ia && (
            <div style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(176,128,255,0.08)", border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
                <Icon name="sparkle" size={11} color={theme.accent} /> Sugerencia de la IA (RAG ISO 27002)
              </div>
              <div style={{ fontSize: 12, color: theme.inkSoft, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item.soa.justificacion_ia}</div>
            </div>
          )}

          <div>
            <label style={labelStyle}>¿Aplica?</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[true, false].map((v) => (
                <button key={String(v)} type="button" onClick={() => setAplica(v)} style={{ height: 30, padding: "0 16px", borderRadius: 999, border: `1px solid ${aplica === v ? theme.accent : theme.border}`, background: aplica === v ? theme.accent : "transparent", color: aplica === v ? "#fff" : theme.inkSoft, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>{v ? "Sí" : "No"}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Estado de implementación</label>
            <select style={inputStyle} value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS_EDIT.map((s) => <option key={s} value={s} style={{ background: theme.surfaceSolid }}>{estadoLabel(s)}</option>)}
            </select>
          </div>

          {/* #1 — Responsable de la implementación (cláusula 5.3). */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Rol responsable (5.3)</label>
              <select style={inputStyle} value={rolId ?? ""} onChange={(e) => setRolId(e.target.value ? Number(e.target.value) : null)}>
                <option value="" style={{ background: theme.surfaceSolid }}>— Sin asignar —</option>
                {roles.map((r) => <option key={r.id} value={r.id} style={{ background: theme.surfaceSolid }}>{r.codigo} — {r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Titular (usuario)</label>
              <select style={inputStyle} value={responsableId ?? ""} onChange={(e) => setResponsableId(e.target.value ? Number(e.target.value) : null)}>
                <option value="" style={{ background: theme.surfaceSolid }}>— Sin asignar —</option>
                {usuarios.map((u) => <option key={u.id} value={u.id} style={{ background: theme.surfaceSolid }}>{u.nombre} · {u.rol}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Justificación {isGen && "(puedes ajustar la de la IA)"}</label>
            <textarea style={textareaStyle} value={justificacion} onChange={(e) => setJustificacion(e.target.value)} placeholder="Por qué (no) aplica este control en la organización…" />
          </div>
          <div>
            <label style={labelStyle}>Documento de evidencia</label>
            <select style={inputStyle} value={evidenciaDocId ?? ""} onChange={(e) => setEvidenciaDocId(e.target.value ? Number(e.target.value) : null)}>
              <option value="" style={{ background: theme.surfaceSolid }}>— Sin documento —</option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id} style={{ background: theme.surfaceSolid }}>{d.codigo} — {d.nombre}</option>
              ))}
            </select>
            <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 5 }}>
              {documentos.length === 0
                ? "No hay documentos registrados. Créalos en el módulo Documentos para usarlos como evidencia."
                : "La evidencia formal del control es un documento del módulo Documentos (M2)."}
            </div>
            {puedeGenerarEvidencia && (
              <div style={{ marginTop: 8 }}>
                <Button variant="ai" size="sm" icon={<Icon name="sparkle" size={12} />} onClick={generarEvidencia} disabled={genEv}>
                  {genEv ? "Generando documento…" : "Generar documento de evidencia con IA"}
                </Button>
                <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 5 }}>Crea un documento tipo Control siguiendo la estructura de ISO 27002 y lo enlaza como evidencia.</div>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Referencia/URL adicional (opcional)</label>
            <input style={inputStyle} value={evidencia} onChange={(e) => setEvidencia(e.target.value)} placeholder="https://… o nota complementaria" />
          </div>
          <div>
            <label style={labelStyle}>Observaciones</label>
            <textarea style={textareaStyle} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Fecha de revisión</label>
            <input type="date" style={{ ...inputStyle, width: "auto" }} value={fechaRev} onChange={(e) => setFechaRev(e.target.value)} />
          </div>

          {/* #2 — Plan de actividades de implementación. */}
          <ActividadesSection controlId={item.control.id} enSoa={!!item.soa} actividades={item.actividades} usuarios={usuarios} onChanged={onChanged} />

          {err && <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : isGen ? "Aceptar y guardar" : "Guardar"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── #2 Plan de actividades de implementación del control ──────────────────
const actLabel = (e: string): string => ({ pendiente: "Pendiente", en_progreso: "En progreso", hecho: "Hecho" } as Record<string, string>)[e] ?? e;
const actTone = (e: string): "neutral" | "info" | "success" => (e === "hecho" ? "success" : e === "en_progreso" ? "info" : "neutral");

function ActividadesSection({ controlId, enSoa, actividades, usuarios, onChanged }: {
  controlId: number; enSoa: boolean; actividades: Actividad[]; usuarios: UsuarioLite[]; onChanged: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [respId, setRespId] = useState<number | null>(null);
  const [fecha, setFecha] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hechas = actividades.filter((a) => a.estado === "hecho").length;

  const crear = async () => {
    if (desc.trim().length < 2) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/control-actividades", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ control_anexo_a_id: controlId, descripcion: desc.trim(), responsable_usuario_id: respId, fecha_objetivo: fecha || null }),
      });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "No se pudo crear"); return; }
      setDesc(""); setRespId(null); setFecha(""); onChanged();
    } catch { setErr("No se pudo conectar"); }
    finally { setBusy(false); }
  };

  const cambiarEstado = async (a: Actividad) => {
    const next = a.estado === "pendiente" ? "en_progreso" : a.estado === "en_progreso" ? "hecho" : "pendiente";
    setBusy(true);
    try {
      await fetch(`/api/control-actividades/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: next }) });
      onChanged();
    } finally { setBusy(false); }
  };

  const eliminar = async (a: Actividad) => {
    if (!confirm("¿Eliminar esta actividad?")) return;
    setBusy(true);
    try { await fetch(`/api/control-actividades/${a.id}`, { method: "DELETE" }); onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <label style={labelStyle}>Plan de actividades {actividades.length > 0 && `· ${hechas}/${actividades.length} hechas`}</label>

      {!enSoa ? (
        <div style={{ fontSize: 11, color: theme.inkMuted }}>Guarda el control en la SoA (botón inferior) para planificar sus actividades.</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {actividades.length === 0 && <div style={{ fontSize: 11, color: theme.inkMuted }}>Sin actividades aún. Añade la primera abajo.</div>}
            {actividades.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
                <button type="button" onClick={() => cambiarEstado(a)} disabled={busy} title="Cambiar estado" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                  <Badge tone={actTone(a.estado)} dot>{actLabel(a.estado)}</Badge>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: theme.ink, textDecoration: a.estado === "hecho" ? "line-through" : "none" }}>{a.descripcion}</div>
                  <div style={{ fontSize: 10, color: theme.inkMuted }}>
                    {a.responsable_nombre ?? "Sin responsable"}{a.fecha_objetivo ? ` · vence ${a.fecha_objetivo}` : ""}
                  </div>
                </div>
                <button type="button" onClick={() => eliminar(a)} disabled={busy} title="Eliminar" style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 4 }}><Icon name="trash" size={13} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input style={inputStyle} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Nueva actividad de implementación…" />
            <div style={{ display: "flex", gap: 6 }}>
              <select style={{ ...inputStyle, flex: 1 }} value={respId ?? ""} onChange={(e) => setRespId(e.target.value ? Number(e.target.value) : null)}>
                <option value="" style={{ background: theme.surfaceSolid }}>— Responsable —</option>
                {usuarios.map((u) => <option key={u.id} value={u.id} style={{ background: theme.surfaceSolid }}>{u.nombre}</option>)}
              </select>
              <input type="date" style={{ ...inputStyle, width: "auto" }} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              <Button variant="soft" size="sm" icon={<Icon name="plus" size={12} />} onClick={crear} disabled={busy || desc.trim().length < 2}>Añadir</Button>
            </div>
          </div>
          {err && <div style={{ fontSize: 11, color: theme.danger, marginTop: 6 }}>{err}</div>}
        </>
      )}
    </div>
  );
}

// ── Export SoA a HTML (tabla de 93 controles) ─────────────────────────────
function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function buildSoaHtml(items: SoaItem[], orgNombre: string): string {
  const rows = items.map((it) => {
    const estado = effEstado(it);
    const ev = it.soa?.evidencia_documento ? `${it.soa.evidencia_documento.codigo} — ${it.soa.evidencia_documento.nombre}` : "";
    return `<tr><td>${esc(it.control.codigo)}</td><td>${esc(it.control.nombre)}</td><td>${effAplica(it) ? "Sí" : "No"}</td><td>${estadoLabel(estado)}</td><td>${esc(it.soa?.justificacion ?? "")}</td><td>${esc(it.riesgos.join(", "))}</td><td>${esc(ev)}</td></tr>`;
  }).join("");
  return `<p><strong>${esc(orgNombre)}</strong> — Declaración de Aplicabilidad conforme a la cláusula 6.1.3.d de ISO/IEC 27001:2022 (Anexo A · 93 controles).</p>
  <table><thead><tr><th>Control</th><th>Nombre</th><th>Aplica</th><th>Estado</th><th>Justificación</th><th>Riesgos</th><th>Evidencia</th></tr></thead><tbody>${rows}</tbody></table>`;
}
