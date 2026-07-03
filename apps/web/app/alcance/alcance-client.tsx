"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Field, Select, theme } from "@/lib/ui";
import { OPERADORES, FRECUENCIAS, metaTexto, cumpleMeta, type Cumplimiento } from "@/lib/objetivos-medicion";

// Wrapper que tolera meta nula (objetivo cualitativo) para el render por fila.
const cumpleMetaClient = (valor: number, operador: string, metaValor: number | null): boolean =>
  metaValor != null && cumpleMeta(valor, operador, metaValor);

// Tipos
type Org = { id: number; codigo: string; nombre_organizacion: string; alcance_sgsi: string | null };
type Sede = { id: number; codigo: string; nombre_sede: string; pais_sede: string; departamento_sede: string; provincia_sede: string; distrito_sede: string; incluido_alcance: boolean; estado: string };
type Proceso = { id: number; codigo: string; nombre: string; tipo: string; area: string; criticidad: string; incluido_alcance: boolean; estado: string };
type Factor = { id: number; codigo: string; origen: string; categoria: string; tipo: string; descripcion: string; impacto: string; incluido_alcance: boolean };
type Activo = { id: number; codigo: string; nombre: string; tipo: string; clasificacion: string; valoracion: string };
type ProcActivo = { proceso_id: number; activo_informacion_id: number };
type Medicion = { id: number; valor: number; fecha_medicion: string; nota: string; registrado_por: string | null };
type Objetivo = {
  id: number; codigo: string; nombre: string; descripcion: string; indicador: string; meta: string; estado: string;
  // P2 — medición objetiva (9.1)
  meta_valor: number | null; meta_operador: string; unidad: string | null; frecuencia: string | null;
  mediciones: Medicion[]; ultimo_valor: number | null; ultima_fecha: string | null; cumplimiento: Cumplimiento;
};
type Aprobacion = {
  id: number; codigo: string; tipo_entidad: string; entidad_id: number;
  comentario: string; estado: string;
  fecha_solicitud: string; fecha_respuesta: string | null; fecha_vencimiento: string;
};
// Rol del SGSI (cláusula 5.3) y usuario asignable — movido desde Contexto.
type Rol = {
  id: number; codigo: string; nombre: string; tipo: string; descripcion: string;
  responsabilidades: string; autoridades: string; usuario_id: number | null; estado: string;
};
type UsuarioLite = { id: number; nombre: string; rol: string };
type Perms = {
  alcance_update: boolean;
  objetivo_create: boolean; objetivo_update: boolean; objetivo_delete: boolean;
  aprobacion_create: boolean; aprobacion_approve: boolean;
  rol_create: boolean; rol_update: boolean; rol_delete: boolean;
};

type Props = {
  sessionRol: string; sessionNombre: string;
  org: Org; sedes: Sede[]; procesos: Proceso[]; factores: Factor[]; activos: Activo[];
  procesoActivo: ProcActivo[]; objetivos: Objetivo[]; aprobaciones: Aprobacion[];
  roles: Rol[]; usuarios: UsuarioLite[]; perms: Perms;
};

const ROL_TIPO = ["Individual", "Órgano colegiado"];

type TabId = "config" | "roles" | "objetivos";

export function AlcanceClient(p: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("config");

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em" }}>Alcance del SGSI</div>
        <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>M1 · Cláusula 4.3 ISO 27001:2022</div>
      </div>

        <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(0,0,0,0.30)", borderRadius: 12, marginBottom: 14 }}>
          {([
            { id: "config", label: "Configuración del alcance", icon: "target" as const },
            { id: "roles", label: "Roles del SGSI", icon: "users" as const, count: p.roles.length },
            { id: "objetivos", label: `Objetivos del SGSI`, icon: "flag" as const, count: p.objetivos.length },
          ] as Array<{ id: TabId; label: string; icon: Parameters<typeof Icon>[0]["name"]; count?: number }>).map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "none", background: active ? theme.surfaceSolid : "transparent", color: active ? theme.ink : theme.inkMuted, fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                <Icon name={t.icon} size={13} color={active ? theme.accent : "currentColor"} />
                {t.label}
                {t.count !== undefined && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: active ? theme.accentSoft : "rgba(255,255,255,0.08)", color: active ? theme.accentDeep : theme.inkMuted }}>{t.count}</span>}
              </button>
            );
          })}
        </div>

        {tab === "config" && (
          <ConfigPanel
            org={p.org}
            sedes={p.sedes}
            procesos={p.procesos}
            factores={p.factores}
            activos={p.activos}
            procesoActivo={p.procesoActivo}
            canUpdate={p.perms.alcance_update}
            onRefresh={() => router.refresh()}
          />
        )}

        {tab === "roles" && (
          <RolesPanel
            roles={p.roles}
            usuarios={p.usuarios}
            perms={p.perms}
            onRefresh={() => router.refresh()}
          />
        )}

        {tab === "objetivos" && (
          <ObjetivosPanel
            objetivos={p.objetivos}
            aprobaciones={p.aprobaciones}
            sessionNombre={p.sessionNombre}
            sessionRol={p.sessionRol}
            perms={p.perms}
            onRefresh={() => router.refresh()}
          />
        )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PANEL ROLES DEL SGSI (cláusula 5.3) — movido desde Contexto I/E
// ════════════════════════════════════════════════════════════════════
function RolesPanel({ roles, usuarios, perms, onRefresh }: {
  roles: Rol[]; usuarios: UsuarioLite[]; perms: Perms; onRefresh: () => void;
}) {
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; data?: Rol }>(null);
  const usuarioById = new Map(usuarios.map((u) => [u.id, u]));
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, minHeight: 36 }}>
        {perms.rol_create && <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ mode: "create" })}>Nuevo rol</Button>}
      </div>
      <Card padding={0}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}`, fontSize: 11.5, color: theme.inkMuted }}>
          Cláusula 5.3 — roles, responsabilidades y autoridades del SGSI. Asigna un titular (usuario) a cada rol clave de gobierno de la seguridad.
        </div>
        <DataTable
          headers={["Código", "Rol", "Tipo", "Titular asignado", "Estado", ""]}
          rows={roles.map((r) => {
            const titular = r.usuario_id != null ? usuarioById.get(r.usuario_id) : undefined;
            return {
              id: r.id,
              cells: [
                monoCell(r.codigo),
                <span key="n" style={{ fontWeight: 500 }}>{r.nombre}</span>,
                <Badge key="t" tone={r.tipo === "Órgano colegiado" ? "info" : "accent"}>{r.tipo}</Badge>,
                titular
                  ? <span key="u">{titular.nombre} <span style={{ fontSize: 11, color: theme.inkMuted }}>· {titular.rol}</span></span>
                  : <span key="u" style={{ fontSize: 11.5, color: theme.warn }}>Sin asignar</span>,
                <Badge key="e" tone={r.estado === "activo" ? "success" : "neutral"} dot>{r.estado}</Badge>,
                <Icon key="c" name="chevR" size={14} color={theme.inkMuted} />,
              ],
              onClick: perms.rol_update ? () => setModal({ mode: "edit", data: r }) : undefined,
            };
          })}
          empty="Sin roles del SGSI. Crea el primero o ejecuta el seed de roles."
        />
      </Card>
      {modal && <RolModal mode={modal.mode} data={modal.data} usuarios={usuarios} canDelete={perms.rol_delete} onClose={() => setModal(null)} onSaved={() => { setModal(null); onRefresh(); }} />}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// PANEL CONFIG (HU10/HU11/HU13/HU14 + HU12 IA)
// ════════════════════════════════════════════════════════════════════
function ConfigPanel({ org, sedes, procesos, factores, activos, procesoActivo, canUpdate, onRefresh }: {
  org: Org; sedes: Sede[]; procesos: Proceso[]; factores: Factor[]; activos: Activo[]; procesoActivo: ProcActivo[];
  canUpdate: boolean; onRefresh: () => void;
}) {
  const [alcance, setAlcance] = useState(org.alcance_sgsi ?? "");
  const [sedesState, setSedesState] = useState(() => Object.fromEntries(sedes.map((s) => [s.id, s.incluido_alcance])));
  const [procesosState, setProcesosState] = useState(() => Object.fromEntries(procesos.map((p) => [p.id, p.incluido_alcance])));
  const [factoresState, setFactoresState] = useState(() => Object.fromEntries(factores.map((f) => [f.id, f.incluido_alcance])));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // HU11 — activos cubiertos derivados (proceso incluido → todos sus activos)
  const activosCubiertos = useMemo(() => {
    const procesosIn = new Set(Object.entries(procesosState).filter(([, v]) => v).map(([k]) => Number(k)));
    const activoIds = new Set(procesoActivo.filter((r) => procesosIn.has(r.proceso_id)).map((r) => r.activo_informacion_id));
    return activos.filter((a) => activoIds.has(a.id));
  }, [procesosState, procesoActivo, activos]);

  const dirty = useMemo(() => {
    if (alcance !== (org.alcance_sgsi ?? "")) return true;
    for (const s of sedes) if (sedesState[s.id] !== s.incluido_alcance) return true;
    for (const p of procesos) if (procesosState[p.id] !== p.incluido_alcance) return true;
    for (const f of factores) if (factoresState[f.id] !== f.incluido_alcance) return true;
    return false;
  }, [alcance, sedesState, procesosState, factoresState, org.alcance_sgsi, sedes, procesos, factores]);

  const reset = () => {
    setAlcance(org.alcance_sgsi ?? "");
    setSedesState(Object.fromEntries(sedes.map((s) => [s.id, s.incluido_alcance])));
    setProcesosState(Object.fromEntries(procesos.map((p) => [p.id, p.incluido_alcance])));
    setFactoresState(Object.fromEntries(factores.map((f) => [f.id, f.incluido_alcance])));
    setError(null); setInfo(null);
  };

  const [citas, setCitas] = useState<Array<{ seccion: string | null; documento: string; score: number }>>([]);

  // Selección ACTUAL en pantalla (lo que se enviará a la IA — no requiere guardar).
  const sedesIds    = sedes.filter((s) => sedesState[s.id]).map((s) => s.id);
  const procesosIds = procesos.filter((p) => procesosState[p.id]).map((p) => p.id);
  const factoresIds = factores.filter((f) => factoresState[f.id]).map((f) => f.id);
  const canGenerate = sedesIds.length > 0 && procesosIds.length > 0;

  const generar = async () => {
    setGenerating(true); setError(null); setInfo(null); setCitas([]);
    try {
      const res = await fetch("/api/ia/alcance-preliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sedes_ids: sedesIds, procesos_ids: procesosIds, factores_ids: factoresIds }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        alcance?: string;
        error?: string;
        citas?: Array<{ seccion: string | null; documento: string; score: number }>;
        iso_disponible?: boolean;
      };
      if (!res.ok) {
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      if (body.alcance) {
        setAlcance(body.alcance);
        setCitas(body.citas ?? []);
        if (body.iso_disponible === false) {
          setInfo("Borrador generado con IA (la base de conocimiento ISO 27001 aún no está ingestada — pídeselo al administrador del sistema). Revisa y guarda.");
        } else if (body.citas && body.citas.length > 0) {
          setInfo(`Borrador generado con IA basado en ${body.citas.length} fragmentos de la ISO 27001:2022. Revisa, edita y guarda.`);
        } else {
          setInfo("Borrador generado con IA. Revisa, edita y guarda.");
        }
      }
    } catch {
      setError("No se pudo conectar al servicio IA");
    } finally {
      setGenerating(false);
    }
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!canUpdate) return;
    setSaving(true); setError(null); setInfo(null);
    try {
      const payload = {
        alcance_sgsi: alcance,
        sedes_alcance:   sedes.map((s) => ({ id: s.id, incluido: sedesState[s.id]   })),
        procesos_alcance: procesos.map((p) => ({ id: p.id, incluido: procesosState[p.id] })),
        factores_alcance: factores.map((f) => ({ id: f.id, incluido: factoresState[f.id] })),
      };
      const res = await fetch("/api/alcance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Error al guardar");
        return;
      }
      setInfo("Alcance actualizado.");
      onRefresh();
    } catch {
      setError("No se pudo conectar al servidor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={guardar} style={{ display: "grid", gap: 14 }}>
      {/* Textarea + acciones IA */}
      <Card padding={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>Declaración del alcance</div>
            <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>Cláusula 4.3 — Texto narrativo</div>
          </div>
          {canUpdate && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <Button variant="ai" size="sm" icon={<Icon name="sparkle" size={13} />} onClick={generar} disabled={generating || !canGenerate}>
                {generating ? "Generando…" : "Generar borrador con la selección actual"}
              </Button>
              <span style={{ fontSize: 10.5, color: canGenerate ? theme.inkMuted : theme.warn }}>
                {canGenerate
                  ? "Usa lo marcado abajo · no necesitas guardar primero"
                  : "Marca al menos una sede y un proceso abajo"}
              </span>
            </div>
          )}
        </div>
        <textarea
          value={alcance}
          onChange={(e) => setAlcance(e.target.value)}
          disabled={!canUpdate || saving}
          rows={8}
          placeholder="El SGSI de la organización aplica a los procesos de…"
          style={{ width: "100%", padding: "12px 14px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 140, lineHeight: 1.55 }}
        />
        {citas.length > 0 && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: theme.r.md, background: "rgba(176,128,255,0.08)", border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
              Generado con apoyo de ISO 27001:2022
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {citas.map((c, i) => (
                <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}`, color: theme.inkSoft, fontFamily: "ui-monospace,monospace" }}>
                  {c.seccion ?? "(sección no identificada)"}
                  <span style={{ color: theme.inkMuted, marginLeft: 6 }}>·</span>
                  <span style={{ color: theme.inkMuted, marginLeft: 4 }}>{(c.score * 100).toFixed(0)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Sedes en alcance */}
      <Card padding={20}>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Sedes incluidas en el alcance</div>
        {sedes.length === 0 ? (
          <Empty msg="Sin sedes registradas. Regístralas en /contexto → Sedes." />
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {sedes.map((s) => (
              <ToggleRow
                key={s.id}
                disabled={!canUpdate || saving}
                checked={sedesState[s.id]}
                onChange={(v) => setSedesState((prev) => ({ ...prev, [s.id]: v }))}
                title={<><span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: theme.inkMuted, marginRight: 8 }}>{s.codigo}</span>{s.nombre_sede}</>}
                subtitle={`${s.distrito_sede}, ${s.departamento_sede}, ${s.pais_sede}`}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Procesos en alcance */}
      <Card padding={20}>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Procesos incluidos en el alcance</div>
        {procesos.length === 0 ? (
          <Empty msg="Sin procesos registrados. Regístralos en /contexto → Procesos." />
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {procesos.map((pr) => (
              <ToggleRow
                key={pr.id}
                disabled={!canUpdate || saving}
                checked={procesosState[pr.id]}
                onChange={(v) => setProcesosState((prev) => ({ ...prev, [pr.id]: v }))}
                title={<><span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: theme.inkMuted, marginRight: 8 }}>{pr.codigo}</span>{pr.nombre}</>}
                subtitle={`${pr.tipo} · ${pr.area} · criticidad ${pr.criticidad}`}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Activos cubiertos (derivado) */}
      <Card padding={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>Activos cubiertos (derivado vía proceso_activo)</div>
          <Badge tone="neutral">{activosCubiertos.length} de {activos.length}</Badge>
        </div>
        {activosCubiertos.length === 0 ? (
          <Empty msg="Marca al menos un proceso como incluido para que aparezcan sus activos asociados." />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activosCubiertos.map((a) => (
              <span key={a.id} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}`, color: theme.inkSoft }}>
                <span style={{ fontFamily: "ui-monospace,monospace", color: theme.inkMuted }}>{a.codigo}</span> · {a.nombre}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Factores I/E incluidos en el alcance (cláusula 4.1) */}
      <Card padding={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>Factores I/E incluidos en el alcance</div>
          <Badge tone="neutral">{factores.filter((f) => factoresState[f.id]).length} de {factores.length}</Badge>
        </div>
        {factores.length === 0 ? (
          <Empty msg="Sin factores registrados. Regístralos en /contexto → Factores." />
        ) : (
          <div style={{ display: "grid", gap: 6, maxHeight: 280, overflow: "auto" }}>
            {factores.map((f) => (
              <ToggleRow
                key={f.id}
                disabled={!canUpdate || saving}
                checked={factoresState[f.id]}
                onChange={(v) => setFactoresState((prev) => ({ ...prev, [f.id]: v }))}
                title={<><span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: theme.inkMuted, marginRight: 8 }}>{f.codigo}</span>{f.descripcion}</>}
                subtitle={`${f.origen} · ${f.categoria || f.tipo} · impacto ${f.impacto}`}
              />
            ))}
          </div>
        )}
      </Card>

      {info && <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(52,211,153,0.10)", border: `1px solid ${theme.success}40`, color: theme.success, fontSize: 12 }}>{info}</div>}
      {error && <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{error}</div>}

      {canUpdate && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          {dirty && <span style={{ fontSize: 11, color: theme.warn, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="alert" size={12} color={theme.warn} />Tienes cambios sin guardar</span>}
          <Button variant="ghost" onClick={reset} disabled={saving || !dirty}>Restablecer</Button>
          <Button type="submit" variant="primary" disabled={saving || !dirty} icon={<Icon name="check" size={13} />}>
            {saving ? "Guardando…" : "Guardar alcance"}
          </Button>
        </div>
      )}
    </form>
  );
}

function ToggleRow({ checked, onChange, title, subtitle, disabled }: { checked: boolean; onChange: (b: boolean) => void; title: ReactNode; subtitle: string; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}`, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: theme.accent, width: 16, height: 16, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: theme.ink }}>{title}</div>
        <div style={{ fontSize: 11, color: theme.inkMuted }}>{subtitle}</div>
      </div>
      <Badge tone={checked ? "success" : "neutral"} dot>{checked ? "incluido" : "fuera"}</Badge>
    </label>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ padding: 16, textAlign: "center", color: theme.inkMuted, fontStyle: "italic", fontSize: 12 }}>{msg}</div>;
}

// ════════════════════════════════════════════════════════════════════
// PANEL OBJETIVOS (HU15/HU16/HU17 + HU18)
// ════════════════════════════════════════════════════════════════════
// P2 — presentación del cumplimiento derivado (9.1)
const CUMPL_META: Record<Cumplimiento, { tone: "success" | "danger" | "warn" | "neutral"; label: string }> = {
  cumplido:     { tone: "success", label: "Cumple" },
  no_cumplido:  { tone: "danger",  label: "No cumple" },
  sin_medicion: { tone: "warn",    label: "Sin medir" },
  cualitativo:  { tone: "neutral", label: "Cualitativo" },
};

function ObjetivosPanel({ objetivos, aprobaciones, sessionNombre, sessionRol, perms, onRefresh }: {
  objetivos: Objetivo[]; aprobaciones: Aprobacion[]; sessionNombre: string; sessionRol: string; perms: Perms; onRefresh: () => void;
}) {
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; data?: Objetivo }>(null);
  const [selected, setSelected] = useState<Objetivo | null>(null);

  // KPIs 9.1: cobertura de medición y cumplimiento (solo objetivos cuantitativos).
  const cuant = objetivos.filter((o) => o.meta_valor != null);
  const medidos = cuant.filter((o) => o.ultimo_valor != null).length;
  const cumplen = cuant.filter((o) => o.cumplimiento === "cumplido").length;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="neutral">{cuant.length} medible(s)</Badge>
          <Badge tone={medidos < cuant.length ? "warn" : "success"}>{medidos}/{cuant.length} con medición</Badge>
          <Badge tone={cumplen === cuant.length && cuant.length > 0 ? "success" : "info"}>{cumplen}/{cuant.length} cumplen meta</Badge>
        </div>
        {perms.objetivo_create && <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ mode: "create" })}>Nuevo objetivo</Button>}
      </div>
      <Card padding={0}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Código", "Nombre", "Indicador", "Meta", "Última medición", "Cumplimiento (9.1)", "Estado", "Aprob."].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objetivos.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: theme.inkMuted, fontStyle: "italic" }}>
                  Sin objetivos registrados. Crea el primero con el botón Nuevo objetivo.
                </td></tr>
              )}
              {objetivos.map((o) => {
                const apr = aprobaciones.filter((a) => a.entidad_id === o.id);
                const pendiente = apr.find((a) => a.estado === "pendiente");
                const cm = CUMPL_META[o.cumplimiento];
                return (
                  <tr key={o.id}
                    style={{ borderTop: `1px solid ${theme.border}`, cursor: "pointer" }}
                    onDoubleClick={() => setSelected(o)}
                    title="Doble-clic para abrir detalle"
                  >
                    <td style={{ padding: "12px 14px", fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.inkMuted }}>{o.codigo}</td>
                    <td style={{ padding: "12px 14px", color: theme.ink, fontWeight: 500 }}>{o.nombre}</td>
                    <td style={{ padding: "12px 14px", color: theme.inkSoft, fontSize: 12 }}>{o.indicador}</td>
                    <td style={{ padding: "12px 14px", color: theme.ink, fontVariantNumeric: "tabular-nums" }}>
                      {o.meta_valor != null ? metaTexto(o.meta_operador, o.meta_valor, o.unidad) : o.meta}
                    </td>
                    <td style={{ padding: "12px 14px", color: theme.ink, fontVariantNumeric: "tabular-nums" }}>
                      {o.ultimo_valor != null ? <span>{o.ultimo_valor}{o.unidad ? ` ${o.unidad}` : ""} <span style={{ fontSize: 10.5, color: theme.inkMuted }}>· {o.ultima_fecha}</span></span> : <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }}><Badge tone={cm.tone} dot>{cm.label}</Badge></td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge tone={o.estado === "aprobado" ? "success" : o.estado === "cumplido" ? "success" : o.estado === "en_curso" ? "warn" : "neutral"} dot>{o.estado}</Badge>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {pendiente ? <Badge tone="warn" dot>1 pend.</Badge> : apr.length > 0 ? <Badge tone="info">{apr.length}</Badge> : <span style={{ fontSize: 11, color: theme.inkMuted }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 10, textAlign: "center" }}>
        Doble-clic en una fila para ver el detalle, registrar mediciones (9.1) y gestionar aprobaciones (HU18 · triple capa anti-accidente).
      </p>

      {modal && <ObjetivoModal mode={modal.mode} data={modal.data} canDelete={perms.objetivo_delete} onClose={() => setModal(null)} onSaved={() => { setModal(null); onRefresh(); }} />}

      {selected && (
        <ObjetivoDetailPanel
          objetivo={selected}
          aprobaciones={aprobaciones.filter((a) => a.entidad_id === selected.id)}
          sessionNombre={sessionNombre}
          sessionRol={sessionRol}
          perms={perms}
          onClose={() => setSelected(null)}
          onEdit={() => { setModal({ mode: "edit", data: selected }); setSelected(null); }}
          onChanged={() => { onRefresh(); setSelected(null); }}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// ObjetivoModal — crear/editar (HU16, HU17)
// ────────────────────────────────────────────────────────────────────
function ObjetivoModal({ mode, data, canDelete, onClose, onSaved }: { mode: "create" | "edit"; data?: Objetivo; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre:      data?.nombre ?? "",
    descripcion: data?.descripcion ?? "",
    indicador:   data?.indicador ?? "",
    meta:        data?.meta ?? "",
    estado:      data?.estado ?? "en_curso",
    // P2 — meta medible (9.1). meta_valor vacío ⇒ objetivo cualitativo.
    meta_valor:    data?.meta_valor != null ? String(data.meta_valor) : "",
    meta_operador: data?.meta_operador ?? ">=",
    unidad:        data?.unidad ?? "",
    frecuencia:    data?.frecuencia ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const url = mode === "create" ? "/api/objetivos" : `/api/objetivos/${data!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body = {
        nombre: f.nombre, descripcion: f.descripcion, indicador: f.indicador, meta: f.meta, estado: f.estado,
        meta_valor: f.meta_valor.trim() === "" ? null : Number(f.meta_valor),
        meta_operador: f.meta_operador,
        unidad: f.unidad.trim() === "" ? null : f.unidad.trim(),
        frecuencia: f.frecuencia === "" ? null : f.frecuencia,
      };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> };
        if (b.issues) {
          const map: Record<string, string> = {};
          for (const i of b.issues) map[i.path] = i.message;
          setFieldErrs(map);
        }
        setErr(b.error ?? "Error");
        return;
      }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm("¿Eliminar este objetivo?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/objetivos/${data!.id}`, { method: "DELETE" });
      if (!res.ok) { setErr("Error al eliminar"); return; }
      onSaved(); router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={600}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>{mode === "create" ? "Nuevo objetivo del SGSI" : `Editar ${data!.codigo}`}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>Complete los datos del objetivo de seguridad de la información.</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Nombre del objetivo" required value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="Reducir nivel de riesgo residual promedio a ≤7" error={fieldErrs.nombre} />
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Descripción *</span>
            <textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} rows={3} style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${fieldErrs.descripcion ? theme.danger : theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 70 }} />
            {fieldErrs.descripcion && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.descripcion}</span>}
          </label>
          <Field label="Indicador" required value={f.indicador} onChange={(v) => setF({ ...f, indicador: v })} placeholder="Nivel residual promedio (escala 1-25)" error={fieldErrs.indicador} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <Field label="Meta" required value={f.meta} onChange={(v) => setF({ ...f, meta: v })} placeholder="≤7" error={fieldErrs.meta} />
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Estado</span>
              <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })} style={{ height: 40, padding: "0 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
                {["activo", "en_curso", "aprobado", "cumplido", "inactivo"].map((s) => <option key={s} value={s} style={{ background: theme.surfaceSolid }}>{s}</option>)}
              </select>
            </label>
          </div>

          {/* P2 — Meta medible (cláusula 9.1). Opcional: si dejas la meta numérica vacía, el objetivo es cualitativo. */}
          <div style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft, marginBottom: 10 }}>Medición objetiva (9.1) — opcional</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, alignItems: "end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Operador</span>
                <select value={f.meta_operador} onChange={(e) => setF({ ...f, meta_operador: e.target.value })} style={{ height: 40, padding: "0 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
                  {OPERADORES.map((op) => <option key={op} value={op} style={{ background: theme.surfaceSolid }}>{op}</option>)}
                </select>
              </label>
              <Field label="Meta (valor)" value={f.meta_valor} onChange={(v) => setF({ ...f, meta_valor: v })} placeholder="90" />
              <Field label="Unidad" value={f.unidad} onChange={(v) => setF({ ...f, unidad: v })} placeholder="%, días…" />
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Frecuencia</span>
                <select value={f.frecuencia} onChange={(e) => setF({ ...f, frecuencia: e.target.value })} style={{ height: 40, padding: "0 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
                  <option value="" style={{ background: theme.surfaceSolid }}>—</option>
                  {FRECUENCIAS.map((fr) => <option key={fr} value={fr} style={{ background: theme.surfaceSolid }}>{fr}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          {mode === "edit" && canDelete ? <Button variant="danger" size="sm" icon={<Icon name="trash" size={13} />} onClick={del} disabled={saving}>Eliminar</Button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ onClose, width = 680, children }: { onClose: () => void; width?: number; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,8,20,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      {/* maxHeight + overflow: si el contenido supera la pantalla, el popup hace scroll (no se cortan campos). */}
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        {/* Popup OPACO: fondo sólido, sin transparencia ni blur. */}
        <Card padding={24} style={{ background: theme.surfaceSolid, backdropFilter: "none", WebkitBackdropFilter: "none", boxShadow: "0 16px 48px rgba(0,0,0,0.55)" }}>{children}</Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// ObjetivoDetailPanel — detalle + HU18 aprobaciones triple capa
// Capa 1: el botón Aprobar/Rechazar solo aparece aquí (no en la tabla).
// Capa 2: modal con comentario obligatorio ≥ 20 chars.
// Capa 3: muestra identidad confirmada antes de procesar.
// ────────────────────────────────────────────────────────────────────
function ObjetivoDetailPanel({ objetivo, aprobaciones, sessionNombre, sessionRol, perms, onClose, onEdit, onChanged }: {
  objetivo: Objetivo;
  aprobaciones: Aprobacion[];
  sessionNombre: string;
  sessionRol: string;
  perms: Perms;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [responderOpen, setResponderOpen] = useState<null | { id: number; decision: "aprobado" | "rechazado" }>(null);
  const [medirOpen, setMedirOpen] = useState(false);

  const pendiente = aprobaciones.find((a) => a.estado === "pendiente");
  const cm = CUMPL_META[objetivo.cumplimiento];
  const esMedible = objetivo.meta_valor != null;
  const delMedicion = async (id: number) => {
    if (!confirm("¿Eliminar esta medición?")) return;
    const res = await fetch(`/api/objetivos/mediciones/${id}`, { method: "DELETE" });
    if (res.ok) onChanged();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,12,30,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 560, maxWidth: "92%", background: theme.surfaceSolid, borderLeft: `1px solid ${theme.borderStrong}`, boxShadow: "-12px 0 40px rgba(20,12,30,0.45)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink }}>{objetivo.nombre}</div>
              <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>{objetivo.codigo} · Objetivo del SGSI</div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 20, display: "grid", gap: 14 }}>
            <FieldBlock label="Indicador">{objetivo.indicador}</FieldBlock>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FieldBlock label="Meta">{esMedible ? metaTexto(objetivo.meta_operador, objetivo.meta_valor, objetivo.unidad) : objetivo.meta}</FieldBlock>
              <FieldBlock label="Cumplimiento (9.1)">
                <Badge tone={cm.tone} dot>{cm.label}</Badge>
                {objetivo.ultimo_valor != null && <span style={{ fontSize: 12, color: theme.inkMuted, marginLeft: 8 }}>último: {objetivo.ultimo_valor}{objetivo.unidad ? ` ${objetivo.unidad}` : ""} ({objetivo.ultima_fecha})</span>}
              </FieldBlock>
            </div>
            <FieldBlock label="Estado actual"><Badge tone={objetivo.estado === "aprobado" ? "success" : "warn"} dot>{objetivo.estado}</Badge>{objetivo.frecuencia && <span style={{ fontSize: 11, color: theme.inkMuted, marginLeft: 8 }}>medición {objetivo.frecuencia}</span>}</FieldBlock>
            <FieldBlock label="Descripción">{objetivo.descripcion}</FieldBlock>

            {/* P2 — Mediciones (cláusula 9.1) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>Mediciones (9.1)</div>
                {perms.objetivo_update && esMedible && <Button variant="soft" size="sm" icon={<Icon name="plus" size={12} />} onClick={() => setMedirOpen(true)}>Registrar medición</Button>}
              </div>
              {!esMedible ? (
                <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: "italic" }}>Objetivo cualitativo (sin meta numérica). Edítalo y define una meta medible para registrar mediciones.</div>
              ) : objetivo.mediciones.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: "italic" }}>Sin mediciones aún. Registra la primera para evaluar el cumplimiento.</div>
              ) : (
                <div style={{ display: "grid", gap: 5 }}>
                  {objetivo.mediciones.map((m) => {
                    const ok = cumpleMetaClient(m.valor, objetivo.meta_operador, objetivo.meta_valor);
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
                        <span style={{ width: 14, color: ok ? theme.success : theme.danger }}><Icon name={ok ? "check" : "x"} size={13} /></span>
                        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: theme.ink, minWidth: 70 }}>{m.valor}{objetivo.unidad ? ` ${objetivo.unidad}` : ""}</span>
                        <span style={{ fontSize: 11.5, color: theme.inkMuted, fontVariantNumeric: "tabular-nums" }}>{m.fecha_medicion}</span>
                        {m.nota && <span style={{ fontSize: 11.5, color: theme.inkSoft, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nota}</span>}
                        {!m.nota && <span style={{ flex: 1 }} />}
                        {m.registrado_por && <span style={{ fontSize: 10.5, color: theme.inkMuted }}>{m.registrado_por}</span>}
                        {perms.objetivo_update && <button onClick={() => delMedicion(m.id)} title="Eliminar medición" style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 2 }}><Icon name="trash" size={13} /></button>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historial de aprobaciones */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Historial de aprobaciones</div>
              {aprobaciones.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: "italic" }}>Sin solicitudes aún.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {aprobaciones.map((a) => (
                    <div key={a.id} style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: theme.inkMuted }}>{a.codigo}</span>
                        <Badge tone={a.estado === "aprobado" ? "success" : a.estado === "rechazado" ? "danger" : "warn"} dot>{a.estado}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: theme.inkSoft, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{a.comentario}</div>
                      <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 6 }}>
                        Solicitado {a.fecha_solicitud.slice(0, 10)}{a.fecha_respuesta && ` · respondido ${a.fecha_respuesta.slice(0, 10)}`} · vence {a.fecha_vencimiento}
                      </div>

                      {/* HU18 — botones aprobación (Capa 1: solo aquí, no en la tabla) */}
                      {a.estado === "pendiente" && perms.aprobacion_approve && (
                        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                          <Button variant="primary" size="sm" icon={<Icon name="check" size={12} />} onClick={() => setResponderOpen({ id: a.id, decision: "aprobado" })}>Aprobar</Button>
                          <Button variant="danger"  size="sm" icon={<Icon name="x" size={12} />}      onClick={() => setResponderOpen({ id: a.id, decision: "rechazado" })}>Rechazar</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: "12px 20px", borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
            <div style={{ display: "flex", gap: 8 }}>
              {!pendiente && perms.aprobacion_create && objetivo.estado !== "aprobado" && (
                <Button variant="soft" size="sm" icon={<Icon name="send" size={12} />} onClick={() => setSolicitarOpen(true)}>Solicitar aprobación</Button>
              )}
              {perms.objetivo_update && (
                <Button variant="primary" size="sm" icon={<Icon name="edit" size={12} />} onClick={onEdit}>Editar</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {solicitarOpen && (
        <SolicitarModal
          objetivoId={objetivo.id}
          onClose={() => setSolicitarOpen(false)}
          onSaved={() => { setSolicitarOpen(false); onChanged(); }}
        />
      )}

      {responderOpen && (
        <ResponderModal
          aprobacionId={responderOpen.id}
          decision={responderOpen.decision}
          sessionNombre={sessionNombre}
          sessionRol={sessionRol}
          onClose={() => setResponderOpen(null)}
          onSaved={() => { setResponderOpen(null); onChanged(); }}
        />
      )}

      {medirOpen && (
        <RegistrarMedicionModal
          objetivo={objetivo}
          onClose={() => setMedirOpen(false)}
          onSaved={() => { setMedirOpen(false); onChanged(); }}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// P2 — RegistrarMedicionModal (cláusula 9.1): captura valor + fecha + nota.
// El cumplimiento se previsualiza al instante comparando con la meta.
// ────────────────────────────────────────────────────────────────────
function RegistrarMedicionModal({ objetivo, onClose, onSaved }: { objetivo: Objetivo; onClose: () => void; onSaved: () => void }) {
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valorNum = valor.trim() === "" ? null : Number(valor);
  const previa = valorNum != null && !Number.isNaN(valorNum) ? cumpleMetaClient(valorNum, objetivo.meta_operador, objetivo.meta_valor) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (valorNum == null || Number.isNaN(valorNum)) { setErr("Ingresa un valor numérico"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/objetivos/${objetivo.id}/mediciones`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: valorNum, fecha_medicion: fecha, nota }),
      });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>Registrar medición · {objetivo.codigo}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>Meta: {metaTexto(objetivo.meta_operador, objetivo.meta_valor, objetivo.unidad)} · {objetivo.indicador}</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={`Valor medido${objetivo.unidad ? ` (${objetivo.unidad})` : ""}`} required value={valor} onChange={setValor} placeholder="92" />
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Fecha de medición</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ height: 40, padding: "0 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Nota / fuente del dato (opcional)</span>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="De dónde sale el dato, observaciones…" style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 56 }} />
        </label>
        {previa != null && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: previa ? "rgba(52,211,153,0.10)" : "rgba(248,113,113,0.10)", border: `1px solid ${previa ? "rgba(52,211,153,0.3)" : `${theme.danger}40`}`, color: previa ? theme.success : theme.danger, fontSize: 12.5, fontWeight: 600 }}>
            {previa ? "✓ Con este valor el objetivo CUMPLE la meta." : "✗ Con este valor el objetivo NO cumple la meta."}
          </div>
        )}
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : "Registrar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: theme.ink, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SolicitarModal — CISO crea solicitud de aprobación para Gerencia
// ────────────────────────────────────────────────────────────────────
function SolicitarModal({ objetivoId, onClose, onSaved }: { objetivoId: number; onClose: () => void; onSaved: () => void }) {
  const [comentario, setComentario] = useState("");
  // Lazy initializer: Date.now() corre en el callback, no en el render (purity).
  const [fechaVenc, setFechaVenc] = useState(() => new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (comentario.trim().length < 20) { setErr("Mínimo 20 caracteres en el sustento"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/aprobaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_entidad: "objetivo",
          entidad_id: objetivoId,
          comentario,
          fecha_vencimiento: fechaVenc,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErr((b as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>Solicitar aprobación</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>Quedará pendiente hasta que Gerencia la apruebe o rechace.</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Sustento de la solicitud * (mínimo 20 caracteres)</span>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Justificación del objetivo, alineación estratégica, impacto esperado…" style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 90 }} />
            <span style={{ fontSize: 10.5, color: comentario.trim().length >= 20 ? theme.success : theme.inkMuted, fontVariantNumeric: "tabular-nums" }}>
              {comentario.trim().length} caracteres
            </span>
          </label>
          <Field label="Fecha de vencimiento" type="date" value={fechaVenc} onChange={setFechaVenc} required />
        </div>
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving || comentario.trim().length < 20}>{saving ? "Enviando…" : "Enviar solicitud"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────
// ResponderModal — Gerencia aprueba/rechaza (HU18 capa 2+3)
// ────────────────────────────────────────────────────────────────────
function ResponderModal({ aprobacionId, decision, sessionNombre, sessionRol, onClose, onSaved }: {
  aprobacionId: number;
  decision: "aprobado" | "rechazado";
  sessionNombre: string;
  sessionRol: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (comentario.trim().length < 20) { setErr("Mínimo 20 caracteres en el sustento"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/aprobaciones/${aprobacionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comentario }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErr((b as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  const isApprove = decision === "aprobado";

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>
        {isApprove ? "Aprobar objetivo" : "Rechazar objetivo"}
      </div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 14 }}>
        Esta acción quedará registrada en el historial de aprobaciones con tu identidad.
      </div>

      {/* Capa 3: identidad confirmada */}
      <div style={{ padding: 12, borderRadius: theme.r.md, background: isApprove ? "rgba(52,211,153,0.10)" : "rgba(248,113,113,0.10)", border: `1px solid ${isApprove ? theme.success : theme.danger}40`, marginBottom: 14, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.5 }}>
        Vas a {isApprove ? "aprobar" : "rechazar"} este objetivo como{" "}
        <strong style={{ color: theme.ink }}>{sessionNombre}</strong>{" "}
        <Badge tone="accent">{sessionRol}</Badge>.
        Si no eres tú, cierra esta sesión.
      </div>

      <form onSubmit={submit}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Sustento de la decisión * (mínimo 20 caracteres)</span>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder={isApprove ? "Alineación con la estrategia, viabilidad, recursos…" : "Razones del rechazo, ajustes requeridos…"} style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 100 }} />
          <span style={{ fontSize: 10.5, color: comentario.trim().length >= 20 ? theme.success : theme.inkMuted, fontVariantNumeric: "tabular-nums" }}>
            {comentario.trim().length} caracteres
          </span>
        </label>
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant={isApprove ? "primary" : "danger"} disabled={saving || comentario.trim().length < 20}>
            {saving ? "Procesando…" : isApprove ? "Confirmar aprobación" : "Confirmar rechazo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// RolModal + helpers — movidos desde Contexto I/E junto con la pestaña Roles
// ════════════════════════════════════════════════════════════════════
function monoCell(s: string): ReactNode {
  return <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.inkMuted }}>{s}</span>;
}

function DataTable({ headers, rows, empty }: { headers: string[]; rows: Array<{ id: number; cells: ReactNode[]; onClick?: () => void }>; empty: string }) {
  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.02)" }}>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: "center", color: theme.inkMuted, fontStyle: "italic" }}>{empty}</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}
              style={{ borderTop: `1px solid ${theme.border}`, cursor: r.onClick ? "pointer" : "default" }}
              onClick={r.onClick}
              onMouseEnter={(e) => { if (r.onClick) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {r.cells.map((c, i) => (
                <td key={i} style={{ padding: "12px 14px", color: theme.ink }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextArea({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", width: "100%", minHeight: 70, lineHeight: 1.5, opacity: disabled ? 0.7 : 1 }} />;
}

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{msg}</div>;
}

function ModalShell({ title, subtitle, children, onClose, width = 560 }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; width?: number }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,12,30,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width }}>
        <Card padding={24}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, letterSpacing: "-0.01em" }}>{title}</div>
              {subtitle && <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

function ModalActions({ saving, mode, canDelete, onDelete, onClose, submitLabel = "Guardar" }: { saving: boolean; mode: "create" | "edit"; canDelete?: boolean; onDelete?: () => void; onClose: () => void; submitLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
      {mode === "edit" && canDelete && onDelete ? (
        <Button variant="danger" size="sm" icon={<Icon name="trash" size={13} />} onClick={onDelete} disabled={saving}>Eliminar</Button>
      ) : <span />}
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={13} />}>{saving ? "Guardando…" : submitLabel}</Button>
      </div>
    </div>
  );
}

function RolModal({ mode, data, usuarios, canDelete, onClose, onSaved }: { mode: "create" | "edit"; data?: Rol; usuarios: UsuarioLite[]; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre:            data?.nombre ?? "",
    tipo:              data?.tipo ?? "Individual",
    descripcion:       data?.descripcion ?? "",
    responsabilidades: data?.responsabilidades ?? "",
    autoridades:       data?.autoridades ?? "",
    usuario_id:        data?.usuario_id ?? null,
    estado:            data?.estado ?? "activo",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const url = mode === "create" ? "/api/roles" : `/api/roles/${data!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> };
        if (b.issues) {
          const map: Record<string, string> = {};
          for (const i of b.issues) map[i.path] = i.message;
          setFieldErrs(map);
        }
        setErr(b.error ?? "Error");
        return;
      }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirm("¿Eliminar este rol del SGSI?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${data!.id}`, { method: "DELETE" });
      if (!res.ok) { setErr("Error al eliminar"); return; }
      onSaved(); router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={mode === "create" ? "Nuevo rol del SGSI" : `Editar ${data!.codigo}`} subtitle="Cláusula 5.3 — responsabilidades y autoridades" onClose={onClose} width={620}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nombre del rol" required value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="CISO / Responsable de Seguridad" error={fieldErrs.nombre} />
          <Select label="Tipo" value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} options={ROL_TIPO} required />
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Titular asignado</span>
            <select
              value={f.usuario_id != null ? String(f.usuario_id) : ""}
              onChange={(e) => setF({ ...f, usuario_id: e.target.value ? Number(e.target.value) : null })}
              style={{ height: 40, padding: "0 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none" }}
            >
              <option value="" style={{ background: theme.surfaceSolid }}>— Sin asignar —</option>
              {usuarios.map((u) => <option key={u.id} value={u.id} style={{ background: theme.surfaceSolid }}>{u.nombre} · {u.rol}</option>)}
            </select>
          </label>
          <Select label="Estado" value={f.estado} onChange={(v) => setF({ ...f, estado: v })} options={["activo", "inactivo"]} />
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Descripción *</span>
            <TextArea value={f.descripcion} onChange={(v) => setF({ ...f, descripcion: v })} />
            {fieldErrs.descripcion && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.descripcion}</span>}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Responsabilidades *</span>
            <TextArea value={f.responsabilidades} onChange={(v) => setF({ ...f, responsabilidades: v })} />
            {fieldErrs.responsabilidades && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.responsabilidades}</span>}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Autoridades *</span>
            <TextArea value={f.autoridades} onChange={(v) => setF({ ...f, autoridades: v })} />
            {fieldErrs.autoridades && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.autoridades}</span>}
          </label>
        </div>
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12 }}><ErrorBox msg={err} /></div>}
        <ModalActions saving={saving} mode={mode} canDelete={canDelete} onDelete={del} onClose={onClose} />
      </form>
    </ModalShell>
  );
}
