"use client";

import { useState, useMemo, useCallback, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, theme } from "@/lib/ui";

// ── Tipos (espejo del payload serializado por page.tsx) ───────────────────
type Riesgo = {
  id: number; escenario_riesgo_id: number; codigo: string; nombre: string; descripcion: string;
  probabilidad_inicial: number; impacto_inicial: number; nivel_inicial: number;
  tratamiento: string; probabilidad_actual: number; impacto_actual: number;
  nivel_actual: number; origen: string; estado: string;
  aceptado_por_at: Date | null;
  aceptado_por: { nombre: string; correo: string } | null;
};
type Escenario = {
  id: number; codigo: string; nombre: string; descripcion: string; amenaza: string;
  vulnerabilidad: string; dominio: string | null; origen: string; justificacion_ia: string | null;
  estado: string; riesgos: Riesgo[];
};
type Perms = {
  escenario_create: boolean; escenario_update: boolean; escenario_delete: boolean;
  riesgo_create: boolean; riesgo_update: boolean; riesgo_delete: boolean;
  criterios_update: boolean;
};
type Criterios = { maxProb: number; maxImpact: number; apetito: number | null; tolerancia: number | null };

// Fuera de tolerancia: nivel por encima del umbral máximo soportable.
const fueraTolerancia = (nivel: number, tolerancia: number | null): boolean =>
  tolerancia != null && nivel > tolerancia;

// Clasifica un nivel contra apetito/tolerancia (3 zonas). null = sin criterios definidos.
type ZonaInfo = { label: string; tone: "success" | "warn" | "danger" };
const evalApetito = (nivel: number, apetito: number | null, tolerancia: number | null): ZonaInfo | null => {
  if (tolerancia != null && nivel > tolerancia) return { label: "Fuera de tolerancia", tone: "danger" };
  if (apetito != null && nivel > apetito) return { label: "Tolerable", tone: "warn" };
  if (apetito != null || tolerancia != null) return { label: "Dentro del apetito", tone: "success" };
  return null;
};
type Suggestion = {
  dominio: string; nombre: string; descripcion: string; amenaza: string; vulnerabilidad: string;
  probabilidad: number; impacto: number; tratamiento_sugerido: string; justificacion: string; fuente_referencia: string;
};

const DOMINIOS = ["tecnologico", "organizacional", "personas", "fisico"] as const;
type Dominio = (typeof DOMINIOS)[number];
const DOMINIO_LABEL: Record<string, string> = {
  tecnologico: "Tecnológico", organizacional: "Organizacional", personas: "Personas", fisico: "Físico",
};
const TRATAMIENTOS = ["mitigar", "transferir", "aceptar", "evitar"];

// ── Tonos / niveles ───────────────────────────────────────────────────────
const tratTone = (t: string): "warn" | "info" | "success" | "danger" | "neutral" =>
  ({ mitigar: "warn", transferir: "info", aceptar: "success", evitar: "danger" } as const)[t] ?? "neutral";
const escEstadoTone = (e: string): "accent" | "success" | "neutral" =>
  e === "generado" ? "accent" : e === "activo" ? "success" : "neutral";
const riesgoEstadoTone = (e: string): "accent" | "warn" | "success" | "info" | "neutral" =>
  e === "generado" ? "accent" : e === "tratamiento" ? "warn" : e === "controlado" ? "success" : e === "aceptado" ? "info" : "neutral";

const nivelLabel = (n: number, maxScore: number): string => {
  const p = n / maxScore;
  return p >= 0.6 ? "Crítico" : p >= 0.4 ? "Alto" : p >= 0.2 ? "Medio" : "Bajo";
};
const nivelTone = (n: number, maxScore: number): "danger" | "warn" | "info" | "success" => {
  const p = n / maxScore;
  return p >= 0.6 ? "danger" : p >= 0.4 ? "warn" : p >= 0.2 ? "info" : "success";
};

// ── estilos de formulario compartidos ─────────────────────────────────────
const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 12px", borderRadius: theme.r.md, border: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.25)", color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", minHeight: 64, lineHeight: 1.5 };
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: theme.inkSoft, display: "block", marginBottom: 6 };

export function RiesgosClient({
  sessionRol, escenariosInicial, criteriosInicial, perms,
}: { sessionRol: string; escenariosInicial: Escenario[]; criteriosInicial: Criterios; perms: Perms }) {
  const router = useRouter();
  const escenarios = escenariosInicial;
  const riesgos = useMemo(() => escenarios.flatMap((e) => e.riesgos), [escenarios]);

  const [tab, setTab] = useState<"escenarios" | "riesgos" | "matriz">("escenarios");
  const [criteria, setCriteria] = useState<Criterios>(criteriosInicial);
  const [modal, setModal] = useState<null | "criterios" | "escenario" | "riesgo" | "sugerir">(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  // Revisión-antes-de-aceptar: riesgos generados que el usuario va a confirmar
  // (1 desde la tabla de riesgos, N desde un escenario). escenarioId presente
  // cuando se acepta un escenario completo (se marca activo al final).
  const [acceptCtx, setAcceptCtx] = useState<{ risks: Riesgo[]; escenarioId?: number } | null>(null);

  const maxP = criteria.maxProb, maxI = criteria.maxImpact;
  const maxScore = maxP * maxI;

  const escById = useMemo(() => new Map(escenarios.map((e) => [e.id, e])), [escenarios]);
  const detailRiesgo = detailId != null ? riesgos.find((r) => r.id === detailId) ?? null : null;

  const criticos = riesgos.filter((r) => nivelTone(r.nivel_actual, maxScore) === "danger").length;
  const residualAvg = riesgos.length ? (riesgos.reduce((s, r) => s + r.nivel_actual, 0) / riesgos.length).toFixed(1) : "0";
  const generados = escenarios.filter((e) => e.estado === "generado").length;
  const apetito = criteria.apetito;
  const tolerancia = criteria.tolerancia;
  const fueraTol = riesgos.filter((r) => fueraTolerancia(r.nivel_actual, tolerancia)).length;
  const tolerables = riesgos.filter((r) => apetito != null && r.nivel_actual > apetito && !fueraTolerancia(r.nivel_actual, tolerancia)).length;

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Gestión de riesgos</div>
          <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>M3 · Cláusula 6.1 — Escenarios, análisis y tratamiento de riesgos</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {perms.criterios_update && (
            <Button variant="ghost" size="sm" icon={<Icon name="settings" size={13} />} onClick={() => setModal("criterios")}>Criterios de riesgo</Button>
          )}
          {tab === "escenarios" && perms.escenario_create && (
            <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal("escenario")}>Nuevo escenario</Button>
          )}
          {tab === "riesgos" && perms.riesgo_create && (
            <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal("riesgo")}>Nuevo riesgo</Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        <Kpi label="Riesgos" value={riesgos.length} sub={`${escenarios.length} escenarios${generados > 0 ? ` · ${generados} IA` : ""}`} />
        <Kpi label="Nivel crítico" value={criticos} sub="nivel ≥60% del máximo" tone={criticos > 0 ? "danger" : undefined} />
        {tolerancia != null
          ? <Kpi label="Fuera de tolerancia" value={fueraTol} sub={`nivel > ${tolerancia}`} tone={fueraTol > 0 ? "danger" : undefined} />
          : <Kpi label="Fuera de tolerancia" value="—" sub="define la tolerancia" />}
        <Kpi label="Nivel residual prom." value={residualAvg} sub={`escala máx. ${maxScore}`} />
      </div>

      {/* Apetito / Tolerancia de riesgo (criterios de aceptación · cláusula 6.1.2) */}
      <Card padding={14} style={{ marginBottom: 14 }}>
        {apetito == null && tolerancia == null ? (
          <div style={{ fontSize: 12.5, color: theme.inkMuted, fontStyle: "italic" }}>
            Apetito y tolerancia de riesgo sin definir. Configúralos (niveles) en <strong style={{ color: theme.inkSoft }}>“Criterios de riesgo”</strong> para clasificar los riesgos.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 18 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Apetito (nivel)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.success }}>{apetito ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Tolerancia (nivel)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.warn }}>{tolerancia ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Máx. matriz</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.inkMuted }}>{maxScore}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: theme.inkSoft, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Badge tone="success" dot>Dentro del apetito</Badge> ≤ {apetito ?? "—"}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Badge tone="warn" dot>Tolerable</Badge> {tolerables} riesgo(s)</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Badge tone="danger" dot>Fuera de tolerancia</Badge> {fueraTol} · debe(n) tratarse</span>
            </div>
          </div>
        )}
      </Card>

      <Card padding={0}>
        {/* Tabs + AI button */}
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(0,0,0,0.30)", borderRadius: 10 }}>
            {([
              { id: "escenarios", label: "Escenarios", count: escenarios.length },
              { id: "riesgos", label: "Riesgos", count: riesgos.length },
              { id: "matriz", label: `Matriz ${maxP}×${maxI}` },
            ] as Array<{ id: typeof tab; label: string; count?: number }>).map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 30, padding: "0 14px", borderRadius: 7, border: "none", background: active ? theme.surfaceSolid : "transparent", color: active ? theme.ink : theme.inkMuted, fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t.label}
                  {t.count !== undefined && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: active ? theme.accentSoft : "rgba(255,255,255,0.08)", color: active ? theme.accentDeep : theme.inkMuted }}>{t.count}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          {perms.escenario_create && (
            <Button variant="ai" size="sm" icon={<Icon name="sparkle" size={13} />} onClick={() => setModal("sugerir")}>Sugerir riesgos con IA</Button>
          )}
        </div>

        {tab === "escenarios" && <EscenariosTable escenarios={escenarios} maxScore={maxScore} perms={perms} onChanged={() => router.refresh()} onAcceptRequest={(risks, escenarioId) => setAcceptCtx({ risks, escenarioId })} />}
        {tab === "riesgos" && <RiesgosTable escenarios={escenarios} riesgos={riesgos} maxScore={maxScore} apetito={apetito} tolerancia={tolerancia} perms={perms} onOpenRisk={setDetailId} onChanged={() => router.refresh()} onAcceptRequest={(risks) => setAcceptCtx({ risks })} />}
        {tab === "matriz" && <Matriz riesgos={riesgos} maxP={maxP} maxI={maxI} onOpenRisk={setDetailId} />}
      </Card>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 12, textAlign: "center" }}>
        Tu rol: <strong style={{ color: theme.ink }}>{sessionRol}</strong> · los escenarios sugeridos por IA nacen como <Badge tone="accent">Generado</Badge> y requieren tu revisión. Clic en un código de riesgo (tabla o matriz) para ver su detalle, reevaluar el P·I actual e ver su historial.
      </p>

      {/* Modales */}
      {modal === "criterios" && (
        <CriteriosModal criteria={criteria} canSave={perms.criterios_update} onClose={() => setModal(null)} onSaved={(c) => { setCriteria(c); setModal(null); }} />
      )}
      {modal === "escenario" && (
        <EscenarioModal onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh(); }} />
      )}
      {modal === "riesgo" && (
        <RiesgoModal escenarios={escenarios} maxP={maxP} maxI={maxI} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh(); }} />
      )}
      {modal === "sugerir" && (
        <SugerirModal criteria={criteria} existentes={escenarios.map((e) => e.nombre)} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh(); }} />
      )}

      {acceptCtx && (
        <AceptarModal
          ctx={acceptCtx}
          maxP={maxP}
          maxI={maxI}
          maxScore={maxScore}
          onClose={() => setAcceptCtx(null)}
          onDone={() => { setAcceptCtx(null); router.refresh(); }}
        />
      )}

      {detailRiesgo && (
        <RiskDetailDrawer
          key={detailRiesgo.id}
          riesgo={detailRiesgo}
          escenario={escById.get(detailRiesgo.escenario_riesgo_id) ?? null}
          maxP={maxP}
          maxI={maxI}
          maxScore={maxScore}
          apetito={apetito}
          tolerancia={tolerancia}
          canUpdate={perms.riesgo_update}
          onClose={() => setDetailId(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// KPI
// ════════════════════════════════════════════════════════════════════════
function Kpi({ label, value, sub, tone }: { label: string; value: number | string; sub: string; tone?: "danger" | "accent" }) {
  const color = tone === "danger" ? theme.danger : tone === "accent" ? theme.accentDeep : theme.ink;
  return (
    <Card padding={16}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 4 }}>{sub}</div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Tabla de escenarios
// ════════════════════════════════════════════════════════════════════════
function EscenariosTable({ escenarios, maxScore, perms, onChanged, onAcceptRequest }: {
  escenarios: Escenario[]; maxScore: number; perms: Perms; onChanged: () => void;
  onAcceptRequest: (risks: Riesgo[], escenarioId: number) => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);

  const descartar = async (id: number) => {
    if (!confirm("¿Descartar este escenario sugerido? Se eliminará junto con sus riesgos generados.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/escenarios/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "descartar" }) });
      if (res.ok) onChanged();
      else alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error");
    } finally { setBusy(null); }
  };
  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este escenario y sus riesgos?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/escenarios/${id}`, { method: "DELETE" });
      if (res.ok) onChanged();
      else alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error");
    } finally { setBusy(null); }
  };

  if (escenarios.length === 0) {
    return <Empty text="Sin escenarios todavía. Crea uno manual o usa “Sugerir riesgos con IA” para generar escenarios en los 4 dominios." />;
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.02)" }}>
            {["Código", "Nombre", "Dominio", "Amenaza", "Riesgos", "Estado", ""].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {escenarios.map((esc) => {
            const isGen = esc.estado === "generado";
            return (
              <tr key={esc.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                <td style={{ ...tdStyle, fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.inkMuted }}>{esc.codigo}</td>
                <td style={{ ...tdStyle, color: theme.ink, fontWeight: 500, maxWidth: 260 }}>
                  {esc.nombre}
                  {esc.origen === "ia" && esc.justificacion_ia && (
                    <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 3, fontWeight: 400, lineHeight: 1.4 }} title={esc.justificacion_ia}>
                      <Icon name="sparkle" size={10} color={theme.accent} /> {esc.justificacion_ia.slice(0, 90)}{esc.justificacion_ia.length > 90 ? "…" : ""}
                    </div>
                  )}
                </td>
                <td style={tdStyle}>{esc.dominio ? <Badge tone="info">{DOMINIO_LABEL[esc.dominio] ?? esc.dominio}</Badge> : <span style={{ color: theme.inkMuted }}>—</span>}</td>
                <td style={{ ...tdStyle, color: theme.inkSoft, maxWidth: 200, fontSize: 12 }}>{esc.amenaza || "—"}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {esc.riesgos.length === 0 ? <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>
                      : esc.riesgos.map((r) => <Badge key={r.id} tone={nivelTone(r.nivel_actual, maxScore)}>{r.codigo}</Badge>)}
                  </div>
                </td>
                <td style={tdStyle}><Badge tone={escEstadoTone(esc.estado)} dot>{isGen ? "Generado" : esc.estado}</Badge></td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  {isGen && perms.escenario_update ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="primary" size="sm" disabled={busy === esc.id} icon={<Icon name="check" size={12} />} onClick={() => onAcceptRequest(esc.riesgos.filter((r) => r.estado === "generado"), esc.id)}>Revisar y aceptar</Button>
                      <Button variant="danger" size="sm" disabled={busy === esc.id} icon={<Icon name="x" size={12} />} onClick={() => descartar(esc.id)}>Descartar</Button>
                    </div>
                  ) : perms.escenario_delete ? (
                    <button onClick={() => remove(esc.id)} disabled={busy === esc.id} title="Eliminar" style={iconBtn}><Icon name="trash" size={14} /></button>
                  ) : <span style={{ color: theme.inkMuted }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Tabla de riesgos
// ════════════════════════════════════════════════════════════════════════
function RiesgosTable({ escenarios, riesgos, maxScore, apetito, tolerancia, perms, onOpenRisk, onChanged, onAcceptRequest }: {
  escenarios: Escenario[]; riesgos: Riesgo[]; maxScore: number; apetito: number | null; tolerancia: number | null; perms: Perms; onOpenRisk: (id: number) => void; onChanged: () => void;
  onAcceptRequest: (risks: Riesgo[]) => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const escById = useMemo(() => new Map(escenarios.map((e) => [e.id, e])), [escenarios]);

  const descartar = async (id: number) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/riesgos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "descartar" }) });
      if (res.ok) onChanged();
      else alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error");
    } finally { setBusy(null); }
  };
  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este riesgo?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/riesgos/${id}`, { method: "DELETE" });
      if (res.ok) onChanged();
      else alert((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error");
    } finally { setBusy(null); }
  };

  if (riesgos.length === 0) return <Empty text="Sin riesgos registrados. Crea uno manual, o acepta un escenario generado por IA para materializar su riesgo." />;

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.02)" }}>
            {["Código", "Riesgo", "Escenario", "P·I inicial", "Nivel inicial", "P·I actual", "Nivel actual", "Tratamiento", "Estado", ""].map((h) => (
              <th key={h} style={{ ...thStyle, padding: "11px 12px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {riesgos.map((r) => {
            const esc = escById.get(r.escenario_riesgo_id);
            const isGen = r.estado === "generado";
            return (
              <tr key={r.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                <td onClick={() => onOpenRisk(r.id)} title="Ver detalle" style={{ ...tdSm, fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.accentDeep, cursor: "pointer", fontWeight: 600 }}>{r.codigo}</td>
                <td onClick={() => onOpenRisk(r.id)} title="Ver detalle" style={{ ...tdSm, color: theme.ink, fontWeight: 500, maxWidth: 220, cursor: "pointer" }}>{r.nombre}</td>
                <td style={{ ...tdSm, color: theme.inkSoft }}>{esc ? <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11 }}>{esc.codigo}</span> : "—"}</td>
                <td style={{ ...tdSm, fontFamily: "ui-monospace,monospace", textAlign: "center" }}>{r.probabilidad_inicial}·{r.impacto_inicial}</td>
                <td style={tdSm}><Badge tone={nivelTone(r.nivel_inicial, maxScore)}>{nivelLabel(r.nivel_inicial, maxScore)} · {r.nivel_inicial}</Badge></td>
                <td style={{ ...tdSm, fontFamily: "ui-monospace,monospace", textAlign: "center" }}>{r.probabilidad_actual}·{r.impacto_actual}</td>
                <td style={tdSm}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge tone={nivelTone(r.nivel_actual, maxScore)}>{nivelLabel(r.nivel_actual, maxScore)} · {r.nivel_actual}</Badge>
                    {(() => { const z = evalApetito(r.nivel_actual, apetito, tolerancia); return z && z.tone !== "success" ? <Badge tone={z.tone} dot>{z.label}</Badge> : null; })()}
                  </div>
                </td>
                <td style={tdSm}><Badge tone={tratTone(r.tratamiento)}>{r.tratamiento}</Badge></td>
                <td style={tdSm}><Badge tone={riesgoEstadoTone(r.estado)} dot>{isGen ? "Generado" : r.estado}</Badge></td>
                <td style={{ ...tdSm, whiteSpace: "nowrap" }}>
                  {isGen && perms.riesgo_update ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="primary" size="sm" disabled={busy === r.id} icon={<Icon name="check" size={12} />} onClick={() => onAcceptRequest([r])}>Revisar y aceptar</Button>
                      <Button variant="danger" size="sm" disabled={busy === r.id} icon={<Icon name="x" size={12} />} onClick={() => descartar(r.id)}>Descartar</Button>
                    </div>
                  ) : perms.riesgo_delete ? (
                    <button onClick={() => remove(r.id)} disabled={busy === r.id} title="Eliminar" style={iconBtn}><Icon name="trash" size={14} /></button>
                  ) : <span style={{ color: theme.inkMuted }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Matriz N×N
// ════════════════════════════════════════════════════════════════════════
function Matriz({ riesgos, maxP, maxI, onOpenRisk }: { riesgos: Riesgo[]; maxP: number; maxI: number; onOpenRisk: (id: number) => void }) {
  const maxScore = maxP * maxI;
  const matrix = useMemo(() => {
    const m: Riesgo[][][] = Array.from({ length: maxI }, () => Array.from({ length: maxP }, () => [] as Riesgo[]));
    for (const r of riesgos) {
      const prob = Math.min(Math.max(r.probabilidad_actual, 1), maxP);
      const imp = Math.min(Math.max(r.impacto_actual, 1), maxI);
      const ri = maxI - imp, ci = prob - 1;
      if (ri >= 0 && ri < maxI && ci >= 0 && ci < maxP) m[ri][ci].push(r);
    }
    return m;
  }, [riesgos, maxP, maxI]);

  const cellColor = (colIdx: number, rowIdx: number) => {
    const score = (colIdx + 1) * (maxI - rowIdx);
    const pct = score / maxScore;
    if (pct >= 0.6) return { bg: "rgba(248,113,113,0.22)", text: theme.danger };
    if (pct >= 0.4) return { bg: "rgba(251,191,36,0.22)", text: theme.warn };
    if (pct >= 0.2) return { bg: "rgba(96,165,250,0.18)", text: theme.info };
    return { bg: "rgba(52,211,153,0.18)", text: theme.success };
  };

  const top = [...riesgos].sort((a, b) => b.nivel_actual - a.nivel_actual).slice(0, 6);

  return (
    <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10, textAlign: "center" }}>Probabilidad (1–{maxP}) →</div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10, color: theme.inkMuted, fontWeight: 600, letterSpacing: "0.05em" }}>Impacto (1–{maxI}) →</div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `auto repeat(${maxP}, 1fr)`, gap: 4 }}>
            {Array.from({ length: maxI }, (_, rowIdx) => {
              const impVal = maxI - rowIdx;
              return (
                <FragmentRow key={impVal}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, fontSize: 10.5, fontWeight: 600, color: theme.inkMuted }}>{impVal}</div>
                  {Array.from({ length: maxP }, (_, colIdx) => {
                    const bucket = matrix[rowIdx][colIdx];
                    const c = cellColor(colIdx, rowIdx);
                    const limit = maxP > 7 ? 1 : 2;
                    return (
                      <div key={colIdx} style={{ minHeight: maxP > 7 ? 48 : 58, background: c.bg, borderRadius: theme.r.md, border: `1px solid ${theme.border}`, padding: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                        {bucket.slice(0, limit).map((b) => (
                          <button key={b.id} type="button" onClick={() => onOpenRisk(b.id)} title={`${b.codigo} — ${b.nombre} (clic para ver detalle)`} style={{ fontSize: maxP > 7 ? 8.5 : 9.5, fontWeight: 600, padding: "2px 4px", borderRadius: 3, background: theme.surfaceSolid, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", border: "none", cursor: "pointer", fontFamily: "ui-monospace,monospace", textAlign: "left" }}>{b.codigo}</button>
                        ))}
                        {bucket.length > limit && <div style={{ fontSize: 8.5, color: c.text, fontWeight: 600 }}>+{bucket.length - limit}</div>}
                      </div>
                    );
                  })}
                </FragmentRow>
              );
            })}
            <div />
            {Array.from({ length: maxP }, (_, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, paddingTop: 4 }}>{i + 1}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, fontSize: 10.5, color: theme.inkMuted, flexWrap: "wrap" }}>
          {[
            { l: `Bajo (0-${Math.floor(maxScore * 0.2)})`, ci: 0, ri: maxI - 1 },
            { l: `Medio (${Math.floor(maxScore * 0.2) + 1}-${Math.floor(maxScore * 0.4)})`, ci: Math.floor(maxP / 3), ri: Math.floor(maxI / 2) },
            { l: `Alto (${Math.floor(maxScore * 0.4) + 1}-${Math.floor(maxScore * 0.6)})`, ci: Math.floor(maxP * 0.6), ri: 1 },
            { l: `Crítico (${Math.floor(maxScore * 0.6) + 1}-${maxScore})`, ci: maxP - 1, ri: 0 },
          ].map((x) => (
            <span key={x.l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: cellColor(x.ci, x.ri).bg, border: `1px solid ${theme.border}` }} />{x.l}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink, marginBottom: 10 }}>Top riesgos por nivel actual</div>
        {top.length === 0 ? <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: "italic" }}>Aún no hay riesgos.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {top.map((r) => (
              <div key={r.id} onClick={() => onOpenRisk(r.id)} style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: theme.inkMuted, fontFamily: "ui-monospace,monospace", marginBottom: 2 }}>{r.codigo}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: theme.ink }}>{r.nombre}</div>
                  </div>
                  <Badge tone={nivelTone(r.nivel_actual, maxScore)}>{r.nivel_actual}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function FragmentRow({ children }: { children: ReactNode }) { return <>{children}</>; }

// ════════════════════════════════════════════════════════════════════════
// Modal genérico
// ════════════════════════════════════════════════════════════════════════
function Modal({ onClose, onOverlayClick, width = 560, children }: { onClose: () => void; onOverlayClick?: () => void; width?: number; children: ReactNode }) {
  return (
    <div onClick={onOverlayClick ?? onClose} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(20,12,30,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }}>
        <Card padding={24}>{children}</Card>
      </div>
    </div>
  );
}
function ModalHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>{subtitle}</div>
    </>
  );
}
function ErrBox({ msg }: { msg: string }) {
  return <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{msg}</div>;
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

function ScaleControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>{label}</div>
          <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>Rango: 1 a {value}</div>
        </div>
        <div style={{ minWidth: 40, height: 40, borderRadius: theme.r.md, background: theme.accentSoft, color: theme.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>{value}</div>
      </div>
      <input type="range" min={3} max={6} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: theme.accent }} />
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {[3, 4, 5, 6].map((v) => (
          <button key={v} onClick={() => onChange(v)} style={{ height: 28, padding: "0 12px", borderRadius: 999, fontSize: 12, border: `1px solid ${value === v ? theme.accent : theme.border}`, background: value === v ? theme.accent : "transparent", color: value === v ? "#fff" : theme.inkSoft, fontFamily: "inherit", cursor: "pointer" }}>{v}</button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal: Criterios de riesgo
// ════════════════════════════════════════════════════════════════════════
function CriteriosModal({ criteria, canSave, onClose, onSaved }: {
  criteria: Criterios; canSave: boolean; onClose: () => void; onSaved: (c: Criterios) => void;
}) {
  const [draft, setDraft] = useState<Criterios>(criteria);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const maxScore = draft.maxProb * draft.maxImpact;

  // La tolerancia no excede el máximo de la matriz; el apetito no excede la tolerancia.
  const tol = draft.tolerancia != null ? Math.max(1, Math.min(draft.tolerancia, maxScore)) : null;
  const ape = draft.apetito != null ? Math.max(1, Math.min(draft.apetito, tol ?? maxScore)) : null;

  const apply = async () => {
    const final: Criterios = { ...draft, apetito: ape, tolerancia: tol };
    if (!canSave) { onSaved(final); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/organizacion", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterio_riesgo_p: draft.maxProb, criterio_riesgo_i: draft.maxImpact,
          apetito_riesgo: ape,
          tolerancia_riesgo: tol,
        }),
      });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved(final);
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader title="Criterios de evaluación de riesgos" subtitle="Define las escalas de probabilidad e impacto. Ajusta el tamaño de la matriz." />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <ScaleControl label="Escala de Probabilidad" value={draft.maxProb} onChange={(v) => setDraft((s) => ({ ...s, maxProb: v }))} />
        <ScaleControl label="Escala de Impacto" value={draft.maxImpact} onChange={(v) => setDraft((s) => ({ ...s, maxImpact: v }))} />
        <div style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, display: "flex", gap: 12, alignItems: "center" }}>
          <Icon name="grid" size={18} color={theme.accent} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink }}>Matriz resultante: {draft.maxProb}×{draft.maxImpact}</div>
            <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>Puntaje máximo: {maxScore} · Umbral crítico: ≥{Math.ceil(maxScore * 0.6)}</div>
          </div>
        </div>

        {/* Criterios de aceptación del riesgo (cláusula 6.1.2) */}
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Criterios de aceptación del riesgo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Apetito — nivel objetivo (1–{tol ?? maxScore})</label>
              <input style={{ ...inputStyle, width: 120 }} type="number" min={1} max={tol ?? maxScore}
                value={draft.apetito ?? ""} placeholder="—"
                onChange={(e) => setDraft((s) => ({ ...s, apetito: e.target.value ? Math.max(1, Number(e.target.value)) : null }))} />
              <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 4 }}>≤ apetito = <strong>dentro del apetito</strong> (aceptable sin acción).</div>
            </div>
            <div>
              <label style={labelStyle}>Tolerancia — nivel máximo (1–{maxScore})</label>
              <input style={{ ...inputStyle, width: 120 }} type="number" min={1} max={maxScore}
                value={draft.tolerancia ?? ""} placeholder="—"
                onChange={(e) => setDraft((s) => ({ ...s, tolerancia: e.target.value ? Math.max(1, Math.min(maxScore, Number(e.target.value))) : null }))} />
              <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 4 }}>&gt; tolerancia = <strong>fuera de tolerancia</strong> (debe tratarse).</div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: theme.inkMuted }}>
            Deben cumplir <strong>apetito ≤ tolerancia ≤ {maxScore}</strong>. Entre apetito y tolerancia: zona <strong>tolerable</strong> (a vigilar). Sugerencia: apetito ≈{Math.floor(maxScore * 0.2)}, tolerancia ≈{Math.floor(maxScore * 0.4)}.
          </div>
        </div>

        {!canSave && <div style={{ fontSize: 11, color: theme.inkMuted }}>Tu rol no puede guardar criterios; los cambios aplican solo a esta vista.</div>}
        {err && <ErrBox msg={err} />}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="primary" icon={<Icon name="check" size={13} />} disabled={saving} onClick={apply}>{saving ? "Guardando…" : "Aplicar criterios"}</Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal: Nuevo escenario (manual)
// ════════════════════════════════════════════════════════════════════════
function EscenarioModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nombre: "", descripcion: "", amenaza: "", vulnerabilidad: "", dominio: "tecnologico" as Dominio, estado: "activo" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.nombre.trim().length < 2) { setErr("El nombre es obligatorio"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/escenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, origen: "manual" }) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={640}>
      <ModalHeader title="Nuevo escenario de riesgo" subtitle="El código se asigna automáticamente (ESC-NNN)." />
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Dominio</label>
            <select style={inputStyle} value={f.dominio} onChange={(e) => set("dominio", e.target.value)}>
              {DOMINIOS.map((d) => <option key={d} value={d} style={{ background: theme.surfaceSolid }}>{DOMINIO_LABEL[d]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Estado</label>
            <Pills value={f.estado} options={["activo", "inactivo"]} onChange={(v) => set("estado", v)} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} placeholder="Nombre del escenario" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Amenaza</label>
            <input style={inputStyle} placeholder="Qué/quién explota" value={f.amenaza} onChange={(e) => set("amenaza", e.target.value)} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Vulnerabilidad</label>
            <input style={inputStyle} placeholder="Debilidad explotada" value={f.vulnerabilidad} onChange={(e) => set("vulnerabilidad", e.target.value)} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Descripción</label>
            <textarea style={textareaStyle} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
          </div>
        </div>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal: Nuevo riesgo (manual)
// ════════════════════════════════════════════════════════════════════════
function RiesgoModal({ escenarios, maxP, maxI, onClose, onSaved }: {
  escenarios: Escenario[]; maxP: number; maxI: number; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({ escenario_riesgo_id: "", nombre: "", descripcion: "", probabilidad_inicial: "3", impacto_inicial: "3", probabilidad_actual: "3", impacto_actual: "3", tratamiento: "mitigar", estado: "tratamiento" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.escenario_riesgo_id) { setErr("Selecciona el escenario padre"); return; }
    if (f.nombre.trim().length < 2) { setErr("El nombre es obligatorio"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/riesgos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  if (escenarios.length === 0) {
    return (
      <Modal onClose={onClose} width={520}>
        <ModalHeader title="Nuevo riesgo" subtitle="Primero necesitas un escenario." />
        <div style={{ fontSize: 13, color: theme.inkSoft }}>Crea un escenario de riesgo antes de registrar riesgos (cada riesgo cuelga de un escenario).</div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><Button variant="primary" onClick={onClose}>Entendido</Button></div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={680}>
      <ModalHeader title="Nuevo riesgo" subtitle="El código se asigna automáticamente (R-NNN)." />
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Escenario padre</label>
            <select style={inputStyle} value={f.escenario_riesgo_id} onChange={(e) => set("escenario_riesgo_id", e.target.value)}>
              <option value="" style={{ background: theme.surfaceSolid }}>Seleccionar escenario…</option>
              {escenarios.map((esc) => <option key={esc.id} value={esc.id} style={{ background: theme.surfaceSolid }}>{esc.codigo} — {esc.nombre}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} placeholder="Nombre del riesgo" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Descripción</label>
            <textarea style={textareaStyle} placeholder="Describe el riesgo y su materialización…" value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
          </div>
          <div><label style={labelStyle}>Probabilidad inicial (1-{maxP})</label><input style={inputStyle} type="number" min={1} max={maxP} value={f.probabilidad_inicial} onChange={(e) => set("probabilidad_inicial", e.target.value)} /></div>
          <div><label style={labelStyle}>Impacto inicial (1-{maxI})</label><input style={inputStyle} type="number" min={1} max={maxI} value={f.impacto_inicial} onChange={(e) => set("impacto_inicial", e.target.value)} /></div>
          <div><label style={labelStyle}>Probabilidad actual (1-{maxP})</label><input style={inputStyle} type="number" min={1} max={maxP} value={f.probabilidad_actual} onChange={(e) => set("probabilidad_actual", e.target.value)} /></div>
          <div><label style={labelStyle}>Impacto actual (1-{maxI})</label><input style={inputStyle} type="number" min={1} max={maxI} value={f.impacto_actual} onChange={(e) => set("impacto_actual", e.target.value)} /></div>
          <div><label style={labelStyle}>Tratamiento</label><Pills value={f.tratamiento} options={TRATAMIENTOS} onChange={(v) => set("tratamiento", v)} /></div>
          <div><label style={labelStyle}>Estado</label><Pills value={f.estado} options={["tratamiento", "controlado", "aceptado"]} onChange={(v) => set("estado", v)} /></div>
        </div>
        {err && <ErrBox msg={err} />}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal: Sugerir riesgos con IA (config → generar → revisar por dominio)
// ════════════════════════════════════════════════════════════════════════
function SugerirModal({ criteria, existentes, onClose, onSaved }: {
  criteria: Criterios; existentes: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [phase, setPhase] = useState<"config" | "results">("config");
  const [domSel, setDomSel] = useState<Record<Dominio, boolean>>({ tecnologico: true, organizacional: true, personas: true, fisico: true });
  const [porDominio, setPorDominio] = useState(2);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [info, setInfo] = useState<{ nvd_consultado: boolean; cve_encontrados: number; fuentes_disponibles: Record<string, boolean>; omitidos_similares: number; cve_descartados: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);

  // Salir descartando: si ya hay sugerencias generadas que no se han agregado,
  // pedir confirmación antes de cerrar (evita perderlas por un clic fuera).
  const requestExit = () => {
    if (saving) return;
    if (suggestions.length > 0) setConfirmExit(true);
    else onClose();
  };

  const dominios = (Object.keys(domSel) as Dominio[]).filter((d) => domSel[d]);
  const existentesLower = useMemo(() => new Set(existentes.map((n) => n.trim().toLowerCase())), [existentes]);

  // more=true → "Generar más": excluye lo ya mostrado en la sesión y AÑADE los
  // resultados nuevos al lote actual (no reemplaza), para iterar sin repetir.
  const generar = async (more = false) => {
    if (dominios.length === 0) { setErr("Selecciona al menos un dominio"); return; }
    setLoading(true); setErr(null);
    try {
      const excluir = more
        ? suggestions.map((s) => ({ nombre: s.nombre, dominio: s.dominio, amenaza: s.amenaza, vulnerabilidad: s.vulnerabilidad }))
        : [];
      const res = await fetch("/api/ia/sugerir-escenarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dominios, por_dominio: porDominio, max_prob: criteria.maxProb, max_impact: criteria.maxImpact, excluir }),
      });
      const body = await res.json().catch(() => ({})) as { escenarios?: Suggestion[]; nvd_consultado?: boolean; cve_encontrados?: number; fuentes_disponibles?: Record<string, boolean>; omitidos_similares?: number; cve_descartados?: number; error?: string };
      if (!res.ok) { setErr(body.error ?? `Error ${res.status}`); return; }
      const list = body.escenarios ?? [];
      if (more) {
        // Añade solo nombres no mostrados aún; preselecciona los no registrados.
        const yaMostrados = new Set(suggestions.map((s) => s.nombre.trim().toLowerCase()));
        const fresh = list.filter((s) => !yaMostrados.has(s.nombre.trim().toLowerCase()));
        const base = suggestions.length;
        setSuggestions([...suggestions, ...fresh]);
        setSelected((sel) => {
          const n = new Set(sel);
          fresh.forEach((s, k) => { if (!existentesLower.has(s.nombre.trim().toLowerCase())) n.add(base + k); });
          return n;
        });
      } else {
        setSuggestions(list);
        setSelected(new Set(list.map((_, i) => i).filter((i) => !existentesLower.has(list[i].nombre.trim().toLowerCase()))));
      }
      setInfo({ nvd_consultado: !!body.nvd_consultado, cve_encontrados: body.cve_encontrados ?? 0, fuentes_disponibles: body.fuentes_disponibles ?? {}, omitidos_similares: body.omitidos_similares ?? 0, cve_descartados: body.cve_descartados ?? 0 });
      setPhase("results");
    } catch { setErr("No se pudo conectar al servicio IA"); }
    finally { setLoading(false); }
  };

  const toggle = (i: number) => setSelected((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  const agregar = async () => {
    const items = [...selected].map((i) => suggestions[i]).filter(Boolean);
    if (items.length === 0) return;
    setSaving(true); setErr(null);
    try {
      // Secuencial: los códigos (ESC-NNN/R-NNN) se calculan por lectura+escritura,
      // posts concurrentes podrían colisionar en el código único.
      for (let k = 0; k < items.length; k++) {
        const s = items[k];
        setProgress(`Guardando ${k + 1}/${items.length}…`);
        const res = await fetch("/api/escenarios", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: s.nombre, descripcion: s.descripcion, amenaza: s.amenaza, vulnerabilidad: s.vulnerabilidad,
            dominio: s.dominio, origen: "ia",
            justificacion_ia: `${s.justificacion}${s.fuente_referencia ? `\n\nFuente: ${s.fuente_referencia}` : ""}`,
            riesgo: { nombre: s.nombre, descripcion: s.descripcion, probabilidad_inicial: s.probabilidad, impacto_inicial: s.impacto, tratamiento: s.tratamiento_sugerido },
          }),
        });
        if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error al guardar una sugerencia"); setSaving(false); setProgress(""); return; }
      }
      onSaved();
    } catch { setErr("No se pudo conectar"); setSaving(false); setProgress(""); }
  };

  // ── Fase 1: configuración ───────────────────────────────────────────────
  if (phase === "config") {
    return (
      <Modal onClose={onClose} width={560}>
        <ModalHeader title="Sugerir riesgos con IA" subtitle="Genera escenarios contextualizados a tu organización en los 4 dominios ISO 27001:2022. Quedarán como “Generado” para tu revisión." />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={labelStyle}>Dominios a cubrir</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {DOMINIOS.map((d) => (
                <label key={d} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: theme.r.md, border: `1px solid ${domSel[d] ? theme.accent : theme.border}`, background: domSel[d] ? `${theme.accent}12` : "transparent", cursor: "pointer", fontSize: 12.5 }}>
                  <input type="checkbox" checked={domSel[d]} onChange={() => setDomSel((s) => ({ ...s, [d]: !s[d] }))} style={{ accentColor: theme.accent, width: 15, height: 15 }} />
                  {DOMINIO_LABEL[d]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Escenarios por dominio</label>
            <Pills value={String(porDominio)} options={["1", "2", "3"]} onChange={(v) => setPorDominio(Number(v))} />
          </div>
          <div style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, fontSize: 11.5, color: theme.inkSoft, lineHeight: 1.5, display: "flex", gap: 10 }}>
            <Icon name="sparkle" size={16} color={theme.accent} />
            <span>Se usan fuentes reconocidas (MITRE ATT&CK, ISO 27005, ENISA) por dominio. Para activos con tecnología identificada (modelo + versión) se consultan CVE recientes de la NVD en tiempo real.</span>
          </div>
          {err && <ErrBox msg={err} />}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="ai" icon={<Icon name="sparkle" size={13} />} disabled={loading} onClick={() => generar()}>{loading ? "Generando…" : "Generar sugerencias"}</Button>
        </div>
      </Modal>
    );
  }

  // ── Fase 2: revisión de resultados ───────────────────────────────────────
  const byDom = dominios.map((d) => ({ dom: d, items: suggestions.map((s, i) => ({ s, i })).filter((x) => x.s.dominio === d) }));
  return (
    <>
    <Modal onClose={onClose} onOverlayClick={requestExit} width={760}>
      <ModalHeader title="Revisar sugerencias de IA" subtitle="Selecciona las que quieras incorporar. Se guardarán como “Generado” y podrás aceptarlas o descartarlas en la tabla." />
      {info && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <Badge tone={info.nvd_consultado ? "info" : "neutral"} dot>{info.nvd_consultado ? `NVD consultada · ${info.cve_encontrados} CVE` : "NVD no consultada (sin activos con tecnología)"}</Badge>
          {info.omitidos_similares > 0 && (
            <Badge tone="warn" dot>{info.omitidos_similares} omitido(s) por similitud con riesgos existentes</Badge>
          )}
          {info.cve_descartados > 0 && (
            <Badge tone="warn" dot>{info.cve_descartados} cita(s) CVE no fundamentada(s) eliminada(s)</Badge>
          )}
          {Object.entries(info.fuentes_disponibles).map(([d, ok]) => (
            <Badge key={d} tone={ok ? "success" : "warn"}>{DOMINIO_LABEL[d] ?? d}: {ok ? "fuentes RAG" : "conocimiento general"}</Badge>
          ))}
        </div>
      )}
      {suggestions.length === 0 ? (
        <div style={{ fontSize: 13, color: theme.inkSoft, padding: 12 }}>La IA no devolvió sugerencias. Intenta nuevamente o ajusta los dominios.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "52vh", overflow: "auto", paddingRight: 4 }}>
          {byDom.map(({ dom, items }) => items.length > 0 && (
            <div key={dom}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{DOMINIO_LABEL[dom]}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map(({ s, i }) => {
                  const exists = existentesLower.has(s.nombre.trim().toLowerCase());
                  const sel = selected.has(i);
                  return (
                    <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: theme.r.md, cursor: exists ? "not-allowed" : "pointer", background: sel ? `${theme.accent}12` : "rgba(255,255,255,0.02)", border: `1px solid ${sel ? theme.accent : theme.border}`, opacity: exists ? 0.5 : 1 }}>
                      <input type="checkbox" checked={sel} disabled={exists} onChange={() => !exists && toggle(i)} style={{ marginTop: 2, accentColor: theme.accent, width: 15, height: 15, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>{s.nombre}</span>
                          <Badge tone="accent">Generado</Badge>
                          {exists && <Badge tone="neutral">Ya registrado</Badge>}
                          <Badge tone={tratTone(s.tratamiento_sugerido)}>{s.tratamiento_sugerido}</Badge>
                          <span style={{ marginLeft: "auto", fontSize: 11, color: theme.inkMuted, fontFamily: "ui-monospace,monospace" }}>P{s.probabilidad}·I{s.impacto}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: theme.inkSoft, lineHeight: 1.45, marginBottom: 4 }}>{s.descripcion}</div>
                        <div style={{ fontSize: 11, color: theme.inkMuted, lineHeight: 1.4 }}>
                          <strong style={{ color: theme.inkSoft }}>Amenaza:</strong> {s.amenaza} · <strong style={{ color: theme.inkSoft }}>Vuln.:</strong> {s.vulnerabilidad}
                        </div>
                        {(s.justificacion || s.fuente_referencia) && (
                          <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 4, fontStyle: "italic" }}>
                            {s.justificacion} {s.fuente_referencia && <span style={{ color: theme.accentDeep }}>[{s.fuente_referencia}]</span>}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {err && <ErrBox msg={err} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 18 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={() => setPhase("config")} disabled={saving || loading}>← Volver</Button>
          <Button variant="soft" icon={<Icon name="sparkle" size={13} />} onClick={() => generar(true)} disabled={saving || loading}>
            {loading ? "Generando más…" : "Generar más"}
          </Button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {progress && <span style={{ fontSize: 11, color: theme.inkMuted }}>{progress}</span>}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" disabled={saving || selected.size === 0} icon={<Icon name="plus" size={13} />} onClick={agregar}>
            {saving ? "Guardando…" : `Agregar ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
    {confirmExit && (
      <div onClick={() => setConfirmExit(false)} style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(20,12,30,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420 }}>
          <Card padding={24}>
            <ModalHeader title="¿Descartar sugerencias generadas?" subtitle="Si sales ahora, las sugerencias generadas por la IA que no hayas agregado se perderán. Esta acción no se puede deshacer." />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button variant="ghost" onClick={() => setConfirmExit(false)}>Seguir editando</Button>
              <Button variant="danger" onClick={onClose}>Descartar y salir</Button>
            </div>
          </Card>
        </div>
      </div>
    )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Modal: revisar y aceptar riesgo(s) sugerido(s)
// El revisor confirma o ajusta la probabilidad e impacto INICIAL sugeridos por
// la IA antes de aceptar (cláusula 6.1.2 — la valoración debe revisarla el
// responsable). Al aceptar, el riesgo pasa a 'tratamiento' y se sella el autor.
// ════════════════════════════════════════════════════════════════════════
function AceptarModal({ ctx, maxP, maxI, maxScore, onClose, onDone }: {
  ctx: { risks: Riesgo[]; escenarioId?: number };
  maxP: number; maxI: number; maxScore: number; onClose: () => void; onDone: () => void;
}) {
  const [vals, setVals] = useState<Record<number, { pi: string; ii: string }>>(
    () => Object.fromEntries(ctx.risks.map((r) => [r.id, { pi: String(r.probabilidad_inicial), ii: String(r.impacto_inicial) }])),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setVal = (id: number, key: "pi" | "ii", v: string) => setVals((s) => ({ ...s, [id]: { ...s[id], [key]: v } }));

  const aceptar = async () => {
    setSaving(true); setErr(null);
    try {
      for (const r of ctx.risks) {
        const pi = Number(vals[r.id].pi), ii = Number(vals[r.id].ii);
        if (!Number.isInteger(pi) || pi < 1 || pi > maxP || !Number.isInteger(ii) || ii < 1 || ii > maxI) {
          setErr(`Revisa ${r.codigo}: probabilidad (1-${maxP}) e impacto (1-${maxI}) deben ser enteros válidos.`); setSaving(false); return;
        }
        const res = await fetch(`/api/riesgos/${r.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "aceptar", probabilidad_inicial: pi, impacto_inicial: ii }),
        });
        if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? `No se pudo aceptar ${r.codigo}`); setSaving(false); return; }
      }
      // Aceptación de escenario completo: tras confirmar sus riesgos, lo marcamos activo.
      if (ctx.escenarioId != null) {
        await fetch(`/api/escenarios/${ctx.escenarioId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "aceptar" }),
        });
      }
      onDone();
    } catch { setErr("No se pudo conectar"); setSaving(false); }
  };

  const multiple = ctx.risks.length > 1;
  return (
    <Modal onClose={onClose} width={640}>
      <ModalHeader
        title={multiple ? `Revisar y aceptar ${ctx.risks.length} riesgos` : "Revisar y aceptar riesgo"}
        subtitle="Confirma o ajusta la probabilidad e impacto inicial sugeridos por la IA. Al aceptar, el riesgo entra en tratamiento y queda registrado quién lo aceptó."
      />
      {ctx.risks.length === 0 ? (
        <div style={{ fontSize: 13, color: theme.inkSoft }}>Este escenario no tiene riesgos pendientes; al aceptarlo quedará activo.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {ctx.risks.map((r) => {
            const v = vals[r.id]; const nivel = (Number(v.pi) || 0) * (Number(v.ii) || 0);
            return (
              <div key={r.id} style={{ padding: 14, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.accentDeep, fontWeight: 600 }}>{r.codigo}</span>
                  <span style={{ fontSize: 13, color: theme.ink, fontWeight: 500 }}>{r.nombre}</span>
                  {r.origen === "ia" && <Badge tone="accent"><Icon name="sparkle" size={10} /> IA</Badge>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div><label style={labelStyle}>Probabilidad inicial (1-{maxP})</label><input style={inputStyle} type="number" min={1} max={maxP} value={v.pi} onChange={(e) => setVal(r.id, "pi", e.target.value)} /></div>
                  <div><label style={labelStyle}>Impacto inicial (1-{maxI})</label><input style={inputStyle} type="number" min={1} max={maxI} value={v.ii} onChange={(e) => setVal(r.id, "ii", e.target.value)} /></div>
                  <div style={{ paddingBottom: 6 }}>
                    <div style={{ fontSize: 10.5, color: theme.inkMuted, marginBottom: 4 }}>Nivel inicial</div>
                    <Badge tone={nivelTone(nivel, maxScore)}>{nivelLabel(nivel, maxScore)} · {nivel}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {err && <ErrBox msg={err} />}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="primary" onClick={aceptar} disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Aceptando…" : "Aceptar"}</Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Drawer de detalle del riesgo — Información · Reevaluar P·I · Historial
// ════════════════════════════════════════════════════════════════════════
type HistEntry = {
  id: number;
  probabilidad_anterior: number; impacto_anterior: number; nivel_anterior: number;
  probabilidad_nueva: number; impacto_nueva: number; nivel_nuevo: number;
  justificacion: string;
  usuario: { nombre: string; correo: string } | null;
  created_at: string;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10, padding: "8px 0", borderBottom: `1px solid ${theme.border}`, alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <div style={{ fontSize: 12.5, color: theme.ink }}>{children}</div>
    </div>
  );
}

function RiskDetailDrawer({ riesgo, escenario, maxP, maxI, maxScore, apetito, tolerancia, canUpdate, onClose, onChanged }: {
  riesgo: Riesgo; escenario: Escenario | null; maxP: number; maxI: number; maxScore: number; apetito: number | null; tolerancia: number | null; canUpdate: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [tab, setTab] = useState<"info" | "actualizar" | "historial">("info");
  const [pa, setPa] = useState(String(riesgo.probabilidad_actual));
  const [ia, setIa] = useState(String(riesgo.impacto_actual));
  const [just, setJust] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const loadHist = useCallback(async () => {
    setLoadingHist(true);
    try {
      const res = await fetch(`/api/riesgos/${riesgo.id}/historial`);
      const body = (await res.json().catch(() => ({}))) as { historial?: HistEntry[] };
      setHist(body.historial ?? []);
    } finally { setLoadingHist(false); }
  }, [riesgo.id]);

  const openTab = (t: typeof tab) => { setTab(t); if (t === "historial") void loadHist(); };

  const nuevoNivel = (Number(pa) || 0) * (Number(ia) || 0);
  const cambia = Number(pa) !== riesgo.probabilidad_actual || Number(ia) !== riesgo.impacto_actual;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!cambia) { setMsg({ kind: "err", text: "Modifica la probabilidad o el impacto actual para reevaluar." }); return; }
    if (just.trim().length < 20) { setMsg({ kind: "err", text: "La justificación es obligatoria (mínimo 20 caracteres)." }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/riesgos/${riesgo.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probabilidad_actual: Number(pa), impacto_actual: Number(ia), justificacion: just.trim() }),
      });
      if (!res.ok) { setMsg({ kind: "err", text: (await res.json().catch(() => ({})) as { error?: string }).error ?? "Error" }); return; }
      setMsg({ kind: "ok", text: "Reevaluación registrada. El nivel actual y el historial se actualizaron." });
      setJust("");
      onChanged();
      void loadHist();
      setTab("historial");
    } catch { setMsg({ kind: "err", text: "No se pudo conectar" }); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,12,30,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 580, maxWidth: "96%", background: theme.surfaceSolid, borderLeft: `1px solid ${theme.borderStrong}`, boxShadow: "-12px 0 40px rgba(20,12,30,0.45)", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink }}>{riesgo.nombre}</div>
            <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "ui-monospace,monospace" }}>{riesgo.codigo}</span>
              <Badge tone={nivelTone(riesgo.nivel_actual, maxScore)}>{nivelLabel(riesgo.nivel_actual, maxScore)} · {riesgo.nivel_actual}</Badge>
              <Badge tone={riesgoEstadoTone(riesgo.estado)} dot>{riesgo.estado === "generado" ? "Generado" : riesgo.estado}</Badge>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 20px 0" }}>
          {([{ id: "info", label: "Información" }, { id: "actualizar", label: "Reevaluar P·I" }, { id: "historial", label: "Historial" }] as Array<{ id: typeof tab; label: string }>).map((t) => (
            <button key={t.id} onClick={() => openTab(t.id)} style={{ height: 30, padding: "0 14px", borderRadius: 8, border: "none", background: tab === t.id ? theme.surfaceSolid : "transparent", color: tab === t.id ? theme.ink : theme.inkMuted, fontSize: 12, fontWeight: tab === t.id ? 600 : 500, cursor: "pointer", fontFamily: "inherit", borderBottom: tab === t.id ? `2px solid ${theme.accent}` : "2px solid transparent" }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {/* ── Información ── */}
          {tab === "info" && (
            <div>
              <DetailRow label="Escenario">{escenario ? <span><span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11 }}>{escenario.codigo}</span> — {escenario.nombre}</span> : "—"}</DetailRow>
              {escenario?.dominio && <DetailRow label="Dominio"><Badge tone="info">{DOMINIO_LABEL[escenario.dominio] ?? escenario.dominio}</Badge></DetailRow>}
              <DetailRow label="Descripción">{riesgo.descripcion || "—"}</DetailRow>
              <DetailRow label="Tratamiento"><Badge tone={tratTone(riesgo.tratamiento)}>{riesgo.tratamiento}</Badge></DetailRow>
              <DetailRow label="P·I inicial">{riesgo.probabilidad_inicial}·{riesgo.impacto_inicial} → <Badge tone={nivelTone(riesgo.nivel_inicial, maxScore)}>{nivelLabel(riesgo.nivel_inicial, maxScore)} · {riesgo.nivel_inicial}</Badge></DetailRow>
              <DetailRow label="P·I actual">{riesgo.probabilidad_actual}·{riesgo.impacto_actual} → <Badge tone={nivelTone(riesgo.nivel_actual, maxScore)}>{nivelLabel(riesgo.nivel_actual, maxScore)} · {riesgo.nivel_actual}</Badge></DetailRow>
              <DetailRow label="Apetito / Tolerancia">
                {(() => {
                  const z = evalApetito(riesgo.nivel_actual, apetito, tolerancia);
                  if (!z) return <span style={{ color: theme.inkMuted }}>No definidos (configúralos en Criterios)</span>;
                  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge tone={z.tone} dot>{z.label}</Badge>
                    <span style={{ fontSize: 11, color: theme.inkMuted }}>nivel {riesgo.nivel_actual} · apetito {apetito ?? "—"} · tolerancia {tolerancia ?? "—"}</span>
                  </span>;
                })()}
              </DetailRow>
              <DetailRow label="Origen">{riesgo.origen === "ia" ? <Badge tone="accent"><Icon name="sparkle" size={10} /> IA</Badge> : <Badge tone="neutral">Manual</Badge>}</DetailRow>
              <DetailRow label="Aceptado por">
                {riesgo.aceptado_por
                  ? <span>{riesgo.aceptado_por.nombre}{riesgo.aceptado_por_at ? <span style={{ color: theme.inkMuted }}> · {new Date(riesgo.aceptado_por_at).toLocaleString("es-PE")}</span> : null}</span>
                  : <span style={{ color: theme.inkMuted, fontStyle: "italic" }}>Pendiente de aceptación</span>}
              </DetailRow>
              {escenario?.origen === "ia" && escenario.justificacion_ia && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Justificación de la IA</div>
                  <div style={{ fontSize: 12, color: theme.inkSoft, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{escenario.justificacion_ia}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Reevaluar P·I actual ── */}
          {tab === "actualizar" && (
            !canUpdate ? (
              <div style={{ fontSize: 13, color: theme.inkSoft }}>Tu rol no puede reevaluar riesgos. Solo lectura.</div>
            ) : (
              <form onSubmit={guardar}>
                <div style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 14, lineHeight: 1.5 }}>
                  Actualiza la probabilidad e impacto <strong>actuales</strong> (tras controles/tratamiento). El nivel actual se recalcula y el cambio queda registrado en el historial con tu justificación.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={labelStyle}>Probabilidad actual (1-{maxP})</label><input style={inputStyle} type="number" min={1} max={maxP} value={pa} onChange={(e) => setPa(e.target.value)} /></div>
                  <div><label style={labelStyle}>Impacto actual (1-{maxI})</label><input style={inputStyle} type="number" min={1} max={maxI} value={ia} onChange={(e) => setIa(e.target.value)} /></div>
                </div>
                <div style={{ marginTop: 12, padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="grid" size={16} color={theme.accent} />
                  <div style={{ fontSize: 12.5, color: theme.ink }}>
                    Nivel actual resultante: <Badge tone={nivelTone(nuevoNivel, maxScore)}>{nivelLabel(nuevoNivel, maxScore)} · {nuevoNivel}</Badge>
                    {!cambia && <span style={{ fontSize: 11, color: theme.inkMuted, marginLeft: 8 }}>(sin cambios respecto al actual)</span>}
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>Justificación de la reevaluación * (mínimo 20 caracteres)</label>
                  <textarea style={textareaStyle} value={just} onChange={(e) => setJust(e.target.value)} placeholder="Ej. Tras implementar MFA y EDR, la probabilidad de explotación baja de 4 a 2…" />
                  <div style={{ fontSize: 10.5, color: just.trim().length >= 20 ? theme.success : theme.inkMuted, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{just.trim().length} caracteres</div>
                </div>
                {msg && (
                  <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, fontSize: 12, background: msg.kind === "ok" ? "rgba(52,211,153,0.10)" : "rgba(248,113,113,0.10)", border: `1px solid ${msg.kind === "ok" ? theme.success : theme.danger}40`, color: msg.kind === "ok" ? theme.success : theme.danger }}>{msg.text}</div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                  <Button type="submit" variant="primary" disabled={saving || !cambia || just.trim().length < 20} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Registrar reevaluación"}</Button>
                </div>
              </form>
            )
          )}

          {/* ── Historial ── */}
          {tab === "historial" && (
            loadingHist ? <div style={{ color: theme.inkMuted, fontSize: 13, padding: 20, textAlign: "center" }}>Cargando historial…</div>
            : hist.length === 0 ? <div style={{ color: theme.inkMuted, fontSize: 13, padding: 20, textAlign: "center", fontStyle: "italic" }}>Aún no se ha reevaluado este riesgo. Cada cambio del P·I actual se archiva aquí con su justificación.</div>
            : (
              <div style={{ display: "grid", gap: 8 }}>
                {hist.map((h) => (
                  <div key={h.id} style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "ui-monospace,monospace", color: theme.inkSoft }}>P{h.probabilidad_anterior}·I{h.impacto_anterior}</span>
                      <Badge tone={nivelTone(h.nivel_anterior, maxScore)}>{h.nivel_anterior}</Badge>
                      <Icon name="arrowR" size={13} color={theme.inkMuted} />
                      <span style={{ fontFamily: "ui-monospace,monospace", color: theme.ink, fontWeight: 600 }}>P{h.probabilidad_nueva}·I{h.impacto_nueva}</span>
                      <Badge tone={nivelTone(h.nivel_nuevo, maxScore)}>{nivelLabel(h.nivel_nuevo, maxScore)} · {h.nivel_nuevo}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: theme.inkSoft, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{h.justificacion}</div>
                    <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 6 }}>
                      {h.usuario ? `Por ${h.usuario.nombre}` : "Autor desconocido"} · {new Date(h.created_at).toLocaleString("es-PE")}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── helpers de estilo de tabla ────────────────────────────────────────────
const thStyle: React.CSSProperties = { textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "12px 14px" };
const tdSm: React.CSSProperties = { padding: "11px 12px", color: theme.inkSoft, fontSize: 12 };
const iconBtn: React.CSSProperties = { background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 4 };

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 32, textAlign: "center", color: theme.inkMuted, fontStyle: "italic", fontSize: 13 }}>{text}</div>;
}
