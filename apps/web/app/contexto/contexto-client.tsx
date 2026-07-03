"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Field, Select, theme } from "@/lib/ui";

// ════════════════════════════════════════════════════════════════════
// Tipos (los same que devuelve el server component)
// ════════════════════════════════════════════════════════════════════
type Org = {
  id: number; codigo: string; nombre_organizacion: string; ruc: string; sector: string;
  numero_colaboradores: number; dominio: string; mision: string; vision: string;
  estado_sgsi: string; inicio_proyecto: string; estado: string;
};
type Sede = {
  id: number; codigo: string; nombre_sede: string; pais_sede: string;
  departamento_sede: string; provincia_sede: string; distrito_sede: string;
  incluido_alcance: boolean; estado: string;
};
type Factor = {
  id: number; codigo: string; origen: string; categoria: string; tipo: string;
  descripcion: string; impacto: string; fecha_identificacion: string; estado: string;
};
type Parte = {
  id: number; codigo: string; nombre: string; tipo: string; expectativas: string;
  requisitos: string; relevancia: string; contacto: string;
  frecuencia_interaccion: string; responsable_interno: string; estado: string;
};
type Proceso = {
  id: number; codigo: string; nombre: string; tipo: string; area: string;
  criticidad: string; kpis: string; descripcion: string;
  incluido_alcance: boolean; estado: string; activos_ids: number[];
};
type Activo = {
  id: number; codigo: string; nombre: string; tipo: string; formato: string;
  ubicacion: string; clasificacion: string; confidencialidad: string;
  integridad: string; disponibilidad: string; valoracion: string;
  modelo: string; version: string; proveedor: string; exposicion: string | null; estado: string;
  procesos_ids?: number[]; // M:N — fix feedback #2
};

type Perms = {
  org_update: boolean;
  sede_create: boolean; sede_update: boolean; sede_delete: boolean;
  factor_create: boolean; factor_update: boolean; factor_delete: boolean;
  parte_create: boolean; parte_update: boolean; parte_delete: boolean;
  proceso_create: boolean; proceso_update: boolean; proceso_delete: boolean;
  activo_create: boolean; activo_update: boolean; activo_delete: boolean;
};

type Props = {
  sessionRol: string;
  sessionNombre: string;
  orgInicial: Org;
  sedesInicial: Sede[];
  factoresInicial: Factor[];
  partesInicial: Parte[];
  procesosInicial: Proceso[];
  activosInicial: Activo[];
  perms: Perms;
};

const SECTORES = ["Logística y transporte", "Banca y finanzas", "Salud", "Retail", "Tecnología", "Educación", "Manufactura", "Servicios"];
const ESTADOS_SGSI = ["Diagnóstico", "Planificación", "Implementación", "Operación", "Certificado"];
const ORIGEN = ["Externo", "Interno"];
const FACTOR_TIPO = ["Amenaza", "Oportunidad", "Fortaleza", "Debilidad"];
const IMPACTO = ["bajo", "medio", "alto", "crítico"];
const PARTE_TIPO = ["Interna", "Externa"];
const RELEVANCIA = ["alta", "media", "baja"];
const PROCESO_TIPO = ["Estratégico", "Misional", "Soporte"];
const CRITICIDAD = ["alta", "media", "baja"];
const ACTIVO_TIPO = ["Información", "Software", "Hardware", "Personas", "Servicio"];
const CLASIFICACION = ["Público", "Interno", "Restringido", "Confidencial"];
const NIVEL = ["alta", "media", "baja"];
const VALORACION = ["bajo", "medio", "alto", "crítico"];
const EXPOSICION = ["interna", "externa", "nube"];

type TabId = "perfil" | "sedes" | "factores" | "partes" | "procesos" | "activos";

export function ContextoClient(p: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("perfil");

  // Leemos directo de props — al cambiar el servidor (router.refresh) llegan
  // nuevos props y la UI se actualiza sin más. (Fix feedback #3)
  const org = p.orgInicial;
  const sedes = p.sedesInicial;
  const factores = p.factoresInicial;
  const partes = p.partesInicial;
  const procesos = p.procesosInicial;
  const activos = p.activosInicial;

  // Modales
  const [modal, setModal] = useState<null | { tipo: TabId; mode: "create" | "edit"; data?: Record<string, unknown> }>(null);
  const [savingPerfil, setSavingPerfil] = useState(false);

  const refresh = () => router.refresh();

  const tabs: Array<{ id: TabId; label: string; icon: Parameters<typeof Icon>[0]["name"]; count?: number }> = [
    { id: "perfil",   label: "Perfil",               icon: "home" },
    { id: "sedes",    label: "Sedes",                icon: "target", count: sedes.length },
    { id: "factores", label: "Factores I/E",         icon: "layers", count: factores.length },
    { id: "partes",   label: "Partes interesadas",   icon: "users",  count: partes.length },
    { id: "procesos", label: "Procesos",             icon: "grid",   count: procesos.length },
    { id: "activos",  label: "Activos de información", icon: "shield", count: activos.length },
  ];

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em" }}>Contexto interno y externo</div>
        <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>M1 · Cláusula 4.1–4.2 ISO 27001:2022</div>
      </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(0,0,0,0.30)", borderRadius: 12, marginBottom: 14, overflowX: "auto" }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? theme.surfaceSolid : "transparent",
                  color: active ? theme.ink : theme.inkMuted,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                <Icon name={t.icon} size={13} color={active ? theme.accent : "currentColor"} />
                {t.label}
                {t.count !== undefined && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: active ? theme.accentSoft : "rgba(255,255,255,0.08)", color: active ? theme.accentDeep : theme.inkMuted, fontVariantNumeric: "tabular-nums" }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action button bar (top-right by tab) */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, minHeight: 36 }}>
          {tab === "sedes"    && p.perms.sede_create    && <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ tipo: "sedes",    mode: "create" })}>Nueva sede</Button>}
          {tab === "factores" && p.perms.factor_create  && <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ tipo: "factores", mode: "create" })}>Nuevo factor</Button>}
          {tab === "partes"   && p.perms.parte_create   && <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ tipo: "partes",   mode: "create" })}>Nueva parte</Button>}
          {tab === "procesos" && p.perms.proceso_create && <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ tipo: "procesos", mode: "create" })}>Nuevo proceso</Button>}
          {tab === "activos"  && p.perms.activo_create  && <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setModal({ tipo: "activos",  mode: "create" })}>Nuevo activo</Button>}
        </div>

        <Card padding={0}>
          {tab === "perfil" && (
            <PerfilForm org={org} canUpdate={p.perms.org_update} saving={savingPerfil} setSaving={setSavingPerfil} onSaved={refresh} />
          )}

          {tab === "sedes" && (
            <DataTable
              headers={["Código", "Nombre sede", "País", "Departamento", "Provincia", "Distrito", "Alcance", "Estado"]}
              rows={sedes.map((s) => ({
                id: s.id,
                cells: [
                  monoCell(s.codigo), s.nombre_sede, s.pais_sede, s.departamento_sede,
                  s.provincia_sede, s.distrito_sede,
                  <Badge key="alc" tone={s.incluido_alcance ? "success" : "neutral"} dot>{s.incluido_alcance ? "incluida" : "fuera"}</Badge>,
                  <Badge key="est" tone={s.estado === "activo" ? "success" : "neutral"} dot>{s.estado}</Badge>,
                ],
                onClick: p.perms.sede_update ? () => setModal({ tipo: "sedes", mode: "edit", data: s }) : undefined,
              }))}
              empty="Sin sedes registradas. Crea la primera con el botón Nueva sede."
            />
          )}

          {tab === "factores" && (
            <DataTable
              headers={["Código", "Origen", "Categoría", "Tipo", "Descripción", "Impacto", "Fecha", "Estado"]}
              rows={factores.map((f) => ({
                id: f.id,
                cells: [
                  monoCell(f.codigo),
                  <Badge key="o" tone={f.origen === "Externo" ? "info" : "accent"}>{f.origen}</Badge>,
                  f.categoria,
                  <Badge key="t" tone={badgeFactorTipo(f.tipo)} dot>{f.tipo}</Badge>,
                  <span key="d" style={{ maxWidth: 320, display: "inline-block" }}>{f.descripcion}</span>,
                  <Badge key="i" tone={badgeImpacto(f.impacto)}>{f.impacto}</Badge>,
                  monoCell(f.fecha_identificacion),
                  <Badge key="e" tone={f.estado === "activo" ? "success" : "neutral"} dot>{f.estado}</Badge>,
                ],
                onClick: p.perms.factor_update ? () => setModal({ tipo: "factores", mode: "edit", data: f }) : undefined,
              }))}
              empty="Sin factores I/E registrados."
            />
          )}

          {tab === "partes" && (
            <DataTable
              headers={["Código", "Nombre", "Tipo", "Relevancia", "Responsable", "Frecuencia", "Estado"]}
              rows={partes.map((pi) => ({
                id: pi.id,
                cells: [
                  monoCell(pi.codigo), pi.nombre,
                  <Badge key="t" tone={pi.tipo === "Externa" ? "info" : "accent"}>{pi.tipo}</Badge>,
                  <Badge key="r" tone={pi.relevancia === "alta" ? "warn" : pi.relevancia === "media" ? "info" : "neutral"}>{pi.relevancia}</Badge>,
                  pi.responsable_interno, pi.frecuencia_interaccion,
                  <Badge key="e" tone={pi.estado === "activo" ? "success" : "neutral"} dot>{pi.estado}</Badge>,
                ],
                onClick: p.perms.parte_update ? () => setModal({ tipo: "partes", mode: "edit", data: pi }) : undefined,
              }))}
              empty="Sin partes interesadas registradas."
            />
          )}

          {tab === "procesos" && (
            <DataTable
              headers={["Código", "Proceso", "Tipo", "Área", "Criticidad", "Activos", "Alcance", "Estado"]}
              rows={procesos.map((pr) => ({
                id: pr.id,
                cells: [
                  monoCell(pr.codigo), pr.nombre,
                  <Badge key="t" tone={pr.tipo === "Misional" ? "accent" : pr.tipo === "Soporte" ? "info" : "success"}>{pr.tipo}</Badge>,
                  pr.area,
                  <Badge key="c" tone={pr.criticidad === "alta" ? "danger" : pr.criticidad === "media" ? "warn" : "neutral"} dot>{pr.criticidad}</Badge>,
                  <span key="a" style={{ fontSize: 11, color: theme.inkMuted }}>{pr.activos_ids.length}</span>,
                  <Badge key="alc" tone={pr.incluido_alcance ? "success" : "neutral"} dot>{pr.incluido_alcance ? "incluido" : "fuera"}</Badge>,
                  <Badge key="e" tone={pr.estado === "activo" ? "success" : "neutral"} dot>{pr.estado}</Badge>,
                ],
                onClick: p.perms.proceso_update ? () => setModal({ tipo: "procesos", mode: "edit", data: pr }) : undefined,
              }))}
              empty="Sin procesos registrados."
            />
          )}

          {tab === "activos" && (
            <DataTable
              headers={["Código", "Activo", "Tipo", "Formato", "Ubicación", "Clasif.", "CID", "Exposición", "Valoración", "Estado"]}
              rows={activos.map((a) => ({
                id: a.id,
                cells: [
                  monoCell(a.codigo), a.nombre,
                  <Badge key="t" tone={a.tipo === "Información" ? "accent" : a.tipo === "Software" ? "info" : a.tipo === "Hardware" ? "warn" : "success"}>{a.tipo}</Badge>,
                  a.formato,
                  <span key="u" style={{ maxWidth: 200, display: "inline-block", fontSize: 11.5 }}>{a.ubicacion}</span>,
                  <Badge key="cl" tone={a.clasificacion === "Confidencial" ? "danger" : a.clasificacion === "Restringido" ? "warn" : "neutral"}>{a.clasificacion}</Badge>,
                  <span key="cid" style={{ fontFamily: "ui-monospace,monospace", fontSize: 11 }}>{a.confidencialidad[0].toUpperCase()}·{a.integridad[0].toUpperCase()}·{a.disponibilidad[0].toUpperCase()}</span>,
                  a.exposicion
                    ? <Badge key="exp" tone={a.exposicion === "externa" ? "danger" : a.exposicion === "nube" ? "info" : "neutral"}>{a.exposicion}</Badge>
                    : <span key="exp" style={{ fontSize: 11, color: theme.inkMuted }}>—</span>,
                  <Badge key="v" tone={a.valoracion === "crítico" ? "danger" : a.valoracion === "alto" ? "warn" : "neutral"} dot>{a.valoracion}</Badge>,
                  <Badge key="e" tone={a.estado === "activo" ? "success" : "neutral"} dot>{a.estado}</Badge>,
                ],
                onClick: p.perms.activo_update ? () => setModal({ tipo: "activos", mode: "edit", data: a }) : undefined,
              }))}
              empty="Sin activos registrados."
            />
          )}
        </Card>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 14, textAlign: "center" }}>
        Datos filtrados por organizacion_id={p.orgInicial.id} · {p.orgInicial.codigo}
      </p>

      {modal?.tipo === "sedes"    && <SedeModal    mode={modal.mode} data={modal.data as Sede | undefined}    canDelete={p.perms.sede_delete}    onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal?.tipo === "factores" && <FactorModal  mode={modal.mode} data={modal.data as Factor | undefined}  canDelete={p.perms.factor_delete}  onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal?.tipo === "partes"   && <ParteModal   mode={modal.mode} data={modal.data as Parte | undefined}   canDelete={p.perms.parte_delete}   onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal?.tipo === "procesos" && <ProcesoModal mode={modal.mode} data={modal.data as Proceso | undefined} activos={activos} canDelete={p.perms.proceso_delete} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal?.tipo === "activos"  && <ActivoModal  mode={modal.mode} data={modal.data as Activo | undefined}  procesos={procesos} canDelete={p.perms.activo_delete}  onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers visuales
// ────────────────────────────────────────────────────────────────────
function monoCell(s: string): ReactNode {
  return <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: theme.inkMuted }}>{s}</span>;
}
function badgeFactorTipo(t: string): "danger" | "warn" | "success" | "neutral" {
  if (t === "Amenaza") return "danger";
  if (t === "Debilidad") return "warn";
  if (t === "Oportunidad" || t === "Fortaleza") return "success";
  return "neutral";
}
function badgeImpacto(i: string): "danger" | "warn" | "info" | "neutral" {
  if (i === "crítico") return "danger";
  if (i === "alto") return "warn";
  if (i === "medio") return "info";
  return "neutral";
}

// ────────────────────────────────────────────────────────────────────
// DataTable genérica
// ────────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────────
// Perfil form (PATCH /api/organizacion)
// ────────────────────────────────────────────────────────────────────
function PerfilForm({ org, canUpdate, saving, setSaving, onSaved }: { org: Org; canUpdate: boolean; saving: boolean; setSaving: (b: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState(org);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Org) => (v: string) => setForm((f) => ({ ...f, [k]: k === "numero_colaboradores" ? Number(v) : v } as Org));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canUpdate) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/organizacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_organizacion: form.nombre_organizacion,
          sector: form.sector,
          numero_colaboradores: form.numero_colaboradores,
          dominio: form.dominio,
          mision: form.mision,
          vision: form.vision,
          estado_sgsi: form.estado_sgsi,
          inicio_proyecto: form.inicio_proyecto,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Error al guardar");
        return;
      }
      onSaved();
    } catch { setError("No se pudo conectar al servidor"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ padding: 24, display: "grid", gap: 18 }}>
      <Section title="Identificación">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12 }}>
          <ReadOnlyField label="Código" v={org.codigo} />
          <Field label="Nombre de la organización" value={form.nombre_organizacion} onChange={set("nombre_organizacion")} disabled={!canUpdate || saving} />
          <ReadOnlyField label="RUC" v={org.ruc} />
          <Select label="Sector" value={form.sector} onChange={set("sector")} options={SECTORES} />
          <Field label="Dominio corporativo" value={form.dominio} onChange={set("dominio")} disabled={!canUpdate || saving} />
          <Field label="N° colaboradores" type="number" value={String(form.numero_colaboradores)} onChange={set("numero_colaboradores")} disabled={!canUpdate || saving} />
          <Field label="Inicio de proyecto" type="date" value={form.inicio_proyecto} onChange={set("inicio_proyecto")} disabled={!canUpdate || saving} />
          <Select label="Estado del SGSI" value={form.estado_sgsi} onChange={set("estado_sgsi")} options={ESTADOS_SGSI} />
          <ReadOnlyField label="Norma de referencia" v="ISO/IEC 27001:2022" />
        </div>
      </Section>
      <Section title="Misión">
        <TextArea value={form.mision} onChange={(v) => setForm((f) => ({ ...f, mision: v }))} disabled={!canUpdate || saving} />
      </Section>
      <Section title="Visión">
        <TextArea value={form.vision} onChange={(v) => setForm((f) => ({ ...f, vision: v }))} disabled={!canUpdate || saving} />
      </Section>
      {error && <ErrorBox msg={error} />}
      {canUpdate && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant="primary" disabled={saving} icon={<Icon name="check" size={14} />}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      )}
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function ReadOnlyField({ label, v }: { label: string; v: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>{label}</span>
      <input value={v} readOnly disabled style={{ height: 40, padding: "0 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.15)", border: `1px solid ${theme.border}`, color: theme.inkSoft, fontSize: 13, fontFamily: "inherit", outline: "none", opacity: 0.6, cursor: "not-allowed" }} />
    </label>
  );
}
function TextArea({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", width: "100%", minHeight: 70, lineHeight: 1.5, opacity: disabled ? 0.7 : 1 }} />;
}
function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{msg}</div>;
}

// ────────────────────────────────────────────────────────────────────
// Generic modal shell + form helpers
// ────────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────────
// SedeModal
// ────────────────────────────────────────────────────────────────────
function SedeModal({ mode, data, canDelete, onClose, onSaved }: { mode: "create" | "edit"; data?: Sede; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre_sede:       data?.nombre_sede ?? "",
    pais_sede:         data?.pais_sede ?? "Perú",
    departamento_sede: data?.departamento_sede ?? "",
    provincia_sede:    data?.provincia_sede ?? "",
    distrito_sede:     data?.distrito_sede ?? "",
    incluido_alcance:  data?.incluido_alcance ?? true,
    estado:            data?.estado ?? "activo",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const url = mode === "create" ? "/api/sedes" : `/api/sedes/${data!.id}`;
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
    } catch { setErr("No se pudo conectar al servidor"); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm("¿Eliminar esta sede?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sedes/${data!.id}`, { method: "DELETE" });
      if (!res.ok) { setErr("Error al eliminar"); return; }
      onSaved(); router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={mode === "create" ? "Nueva sede" : `Editar sede ${data!.codigo}`} subtitle={mode === "create" ? "Complete los datos de la nueva sede." : undefined} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nombre de la sede" required value={f.nombre_sede} onChange={(v) => setF({ ...f, nombre_sede: v })} placeholder="Sede comercial Cusco" error={fieldErrs.nombre_sede} />
          <Field label="País" required value={f.pais_sede} onChange={(v) => setF({ ...f, pais_sede: v })} error={fieldErrs.pais_sede} />
          <Field label="Departamento" required value={f.departamento_sede} onChange={(v) => setF({ ...f, departamento_sede: v })} error={fieldErrs.departamento_sede} />
          <Field label="Provincia" required value={f.provincia_sede} onChange={(v) => setF({ ...f, provincia_sede: v })} error={fieldErrs.provincia_sede} />
          <Field label="Distrito" required value={f.distrito_sede} onChange={(v) => setF({ ...f, distrito_sede: v })} error={fieldErrs.distrito_sede} />
          <Select label="Estado" value={f.estado} onChange={(v) => setF({ ...f, estado: v })} options={["activo", "inactivo"]} />
        </div>
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12 }}><ErrorBox msg={err} /></div>}
        <ModalActions saving={saving} mode={mode} canDelete={canDelete} onDelete={del} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// FactorModal
// ────────────────────────────────────────────────────────────────────
function FactorModal({ mode, data, canDelete, onClose, onSaved }: { mode: "create" | "edit"; data?: Factor; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    origen:               data?.origen ?? "Externo",
    categoria:            data?.categoria ?? "",
    tipo:                 data?.tipo ?? "Amenaza",
    descripcion:          data?.descripcion ?? "",
    impacto:              data?.impacto ?? "medio",
    fecha_identificacion: data?.fecha_identificacion ?? today,
    estado:               data?.estado ?? "activo",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const url = mode === "create" ? "/api/factores" : `/api/factores/${data!.id}`;
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
    } catch { setErr("No se pudo conectar al servidor"); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm("¿Eliminar este factor?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/factores/${data!.id}`, { method: "DELETE" });
      if (!res.ok) { setErr("Error al eliminar"); return; }
      onSaved(); router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={mode === "create" ? "Nuevo factor I/E" : `Editar factor ${data!.codigo}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Origen" value={f.origen} onChange={(v) => setF({ ...f, origen: v })} options={ORIGEN} required />
          <Field label="Categoría" required value={f.categoria} onChange={(v) => setF({ ...f, categoria: v })} placeholder="Político-legal / Tecnológico / …" error={fieldErrs.categoria} />
          <Select label="Tipo" value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} options={FACTOR_TIPO} required />
          <Select label="Impacto" value={f.impacto} onChange={(v) => setF({ ...f, impacto: v })} options={IMPACTO} required />
          <Field label="Fecha de identificación" type="date" required value={f.fecha_identificacion} onChange={(v) => setF({ ...f, fecha_identificacion: v })} error={fieldErrs.fecha_identificacion} />
          <Select label="Estado" value={f.estado} onChange={(v) => setF({ ...f, estado: v })} options={["activo", "inactivo"]} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Descripción *</span>
            <TextArea value={f.descripcion} onChange={(v) => setF({ ...f, descripcion: v })} />
            {fieldErrs.descripcion && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.descripcion}</span>}
          </label>
        </div>
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12 }}><ErrorBox msg={err} /></div>}
        <ModalActions saving={saving} mode={mode} canDelete={canDelete} onDelete={del} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// ParteModal
// ────────────────────────────────────────────────────────────────────
function ParteModal({ mode, data, canDelete, onClose, onSaved }: { mode: "create" | "edit"; data?: Parte; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre:                 data?.nombre ?? "",
    tipo:                   data?.tipo ?? "Externa",
    expectativas:           data?.expectativas ?? "",
    requisitos:             data?.requisitos ?? "",
    relevancia:             data?.relevancia ?? "media",
    contacto:               data?.contacto ?? "",
    frecuencia_interaccion: data?.frecuencia_interaccion ?? "Mensual",
    responsable_interno:    data?.responsable_interno ?? "",
    estado:                 data?.estado ?? "activo",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const url = mode === "create" ? "/api/partes" : `/api/partes/${data!.id}`;
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
    if (!confirm("¿Eliminar esta parte interesada?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/partes/${data!.id}`, { method: "DELETE" });
      if (!res.ok) { setErr("Error al eliminar"); return; }
      onSaved(); router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={mode === "create" ? "Nueva parte interesada" : `Editar ${data!.codigo}`} onClose={onClose} width={620}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nombre" required value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="Clientes corporativos" error={fieldErrs.nombre} />
          <Select label="Tipo" value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} options={PARTE_TIPO} required />
          <Select label="Relevancia" value={f.relevancia} onChange={(v) => setF({ ...f, relevancia: v })} options={RELEVANCIA} required />
          <Field label="Contacto" value={f.contacto} onChange={(v) => setF({ ...f, contacto: v })} placeholder="comercial@empresa.com" error={fieldErrs.contacto} />
          <Field label="Frecuencia de interacción" required value={f.frecuencia_interaccion} onChange={(v) => setF({ ...f, frecuencia_interaccion: v })} error={fieldErrs.frecuencia_interaccion} />
          <Field label="Responsable interno" required value={f.responsable_interno} onChange={(v) => setF({ ...f, responsable_interno: v })} error={fieldErrs.responsable_interno} />
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Expectativas *</span>
            <TextArea value={f.expectativas} onChange={(v) => setF({ ...f, expectativas: v })} />
            {fieldErrs.expectativas && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.expectativas}</span>}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Requisitos *</span>
            <TextArea value={f.requisitos} onChange={(v) => setF({ ...f, requisitos: v })} />
            {fieldErrs.requisitos && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.requisitos}</span>}
          </label>
        </div>
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12 }}><ErrorBox msg={err} /></div>}
        <ModalActions saving={saving} mode={mode} canDelete={canDelete} onDelete={del} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// ProcesoModal
// ────────────────────────────────────────────────────────────────────
function ProcesoModal({ mode, data, activos, canDelete, onClose, onSaved }: { mode: "create" | "edit"; data?: Proceso; activos: Activo[]; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre:           data?.nombre ?? "",
    tipo:             data?.tipo ?? "Misional",
    area:             data?.area ?? "",
    criticidad:       data?.criticidad ?? "media",
    kpis:             data?.kpis ?? "",
    descripcion:      data?.descripcion ?? "",
    incluido_alcance: data?.incluido_alcance ?? true,
    estado:           data?.estado ?? "activo",
    activos_ids:      (data?.activos_ids ?? []) as number[],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const toggle = (id: number) => setF((s) => ({ ...s, activos_ids: s.activos_ids.includes(id) ? s.activos_ids.filter((x) => x !== id) : [...s.activos_ids, id] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const url = mode === "create" ? "/api/procesos" : `/api/procesos/${data!.id}`;
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
    if (!confirm("¿Eliminar este proceso? Esto eliminará también sus relaciones con activos.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/procesos/${data!.id}`, { method: "DELETE" });
      if (!res.ok) { setErr("Error al eliminar"); return; }
      onSaved(); router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={mode === "create" ? "Nuevo proceso" : `Editar ${data!.codigo}`} onClose={onClose} width={720}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nombre" required value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="Gestión de transporte y rutas" error={fieldErrs.nombre} />
          <Select label="Tipo" value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} options={PROCESO_TIPO} required />
          <Field label="Área" required value={f.area} onChange={(v) => setF({ ...f, area: v })} placeholder="Operaciones / TI / RR.HH." error={fieldErrs.area} />
          <Select label="Criticidad" value={f.criticidad} onChange={(v) => setF({ ...f, criticidad: v })} options={CRITICIDAD} required />
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Descripción *</span>
            <TextArea value={f.descripcion} onChange={(v) => setF({ ...f, descripcion: v })} />
            {fieldErrs.descripcion && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.descripcion}</span>}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>KPIs *</span>
            <TextArea value={f.kpis} onChange={(v) => setF({ ...f, kpis: v })} />
            {fieldErrs.kpis && <span style={{ fontSize: 11, color: theme.danger }}>{fieldErrs.kpis}</span>}
          </label>
        </div>
        {activos.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft, marginBottom: 6 }}>Activos de información asociados</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflow: "auto", padding: 8, border: `1px solid ${theme.border}`, borderRadius: theme.r.md }}>
              {activos.map((a) => {
                const sel = f.activos_ids.includes(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggle(a.id)} style={{ height: 26, padding: "0 10px", borderRadius: 999, border: `1px solid ${sel ? theme.accent : theme.border}`, background: sel ? theme.accent : "transparent", color: sel ? "#fff" : theme.inkSoft, fontSize: 11.5, fontFamily: "inherit", cursor: "pointer" }}>
                    {a.codigo} · {a.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12 }}><ErrorBox msg={err} /></div>}
        <ModalActions saving={saving} mode={mode} canDelete={canDelete} onDelete={del} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// ActivoModal — HU09 + M:N procesos (fix feedback #2)
// ────────────────────────────────────────────────────────────────────
function ActivoModal({ mode, data, procesos, canDelete, onClose, onSaved }: { mode: "create" | "edit"; data?: Activo; procesos: Proceso[]; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre:           data?.nombre ?? "",
    tipo:             data?.tipo ?? "Información",
    formato:          data?.formato ?? "Digital",
    ubicacion:        data?.ubicacion ?? "",
    clasificacion:    data?.clasificacion ?? "Interno",
    confidencialidad: data?.confidencialidad ?? "media",
    integridad:       data?.integridad ?? "media",
    disponibilidad:   data?.disponibilidad ?? "media",
    valoracion:       data?.valoracion ?? "medio",
    modelo:           data?.modelo ?? "",
    version:          data?.version ?? "",
    proveedor:        data?.proveedor ?? "",
    exposicion:       data?.exposicion ?? "interna",
    estado:           data?.estado ?? "activo",
    procesos_ids:     (data?.procesos_ids ?? []) as number[],
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const toggleProc = (id: number) => setF((s) => ({ ...s, procesos_ids: s.procesos_ids.includes(id) ? s.procesos_ids.filter((x) => x !== id) : [...s.procesos_ids, id] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null); setFieldErrs({});
    try {
      const url = mode === "create" ? "/api/activos" : `/api/activos/${data!.id}`;
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
    if (!confirm("¿Eliminar este activo?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/activos/${data!.id}`, { method: "DELETE" });
      if (!res.ok) { setErr("Error al eliminar"); return; }
      onSaved(); router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={mode === "create" ? "Nuevo activo de información" : `Editar ${data!.codigo}`} onClose={onClose} width={720}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nombre del activo" required value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="Base de datos de clientes" error={fieldErrs.nombre} />
          <Select label="Tipo" value={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} options={ACTIVO_TIPO} required />
          <Field label="Formato" required value={f.formato} onChange={(v) => setF({ ...f, formato: v })} placeholder="Digital / Físico / Mixto / N/A" error={fieldErrs.formato} />
          <Select label="Clasificación" value={f.clasificacion} onChange={(v) => setF({ ...f, clasificacion: v })} options={CLASIFICACION} required />
          <Field label="Ubicación" required value={f.ubicacion} onChange={(v) => setF({ ...f, ubicacion: v })} placeholder="Azure SQL — East US 2" error={fieldErrs.ubicacion} />
          <Field label="Proveedor" value={f.proveedor} onChange={(v) => setF({ ...f, proveedor: v })} placeholder="Microsoft Azure" />
          <Field label="Modelo" value={f.modelo} onChange={(v) => setF({ ...f, modelo: v })} placeholder="Azure SQL Database" />
          <Field label="Versión" value={f.version} onChange={(v) => setF({ ...f, version: v })} placeholder="12.0" />
          <Select label="Exposición a red" value={f.exposicion} onChange={(v) => setF({ ...f, exposicion: v })} options={EXPOSICION} required />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: theme.inkMuted }}>
          La exposición pondera el riesgo técnico: <strong>externa</strong> (internet) o <strong>nube</strong> priorizan la búsqueda de CVE recientes (NVD); <strong>interna</strong> reduce la probabilidad de explotación remota.
        </div>
        <div style={{ marginTop: 12, padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft, marginBottom: 8 }}>Triada CID</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <Select label="Confidencialidad" value={f.confidencialidad} onChange={(v) => setF({ ...f, confidencialidad: v })} options={NIVEL} required />
            <Select label="Integridad" value={f.integridad} onChange={(v) => setF({ ...f, integridad: v })} options={NIVEL} required />
            <Select label="Disponibilidad" value={f.disponibilidad} onChange={(v) => setF({ ...f, disponibilidad: v })} options={NIVEL} required />
            <Select label="Valoración global" value={f.valoracion} onChange={(v) => setF({ ...f, valoracion: v })} options={VALORACION} required />
          </div>
        </div>

        {/* M:N — Procesos que soporta este activo (fix feedback #2) */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft, marginBottom: 6 }}>Procesos que soporta este activo ({f.procesos_ids.length} seleccionados)</div>
          {procesos.length === 0 ? (
            <div style={{ fontSize: 11.5, color: theme.inkMuted, fontStyle: "italic", padding: 10, border: `1px dashed ${theme.border}`, borderRadius: theme.r.md }}>
              Sin procesos registrados. Crea uno desde la pestaña Procesos primero.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflow: "auto", padding: 8, border: `1px solid ${theme.border}`, borderRadius: theme.r.md }}>
              {procesos.map((pr) => {
                const sel = f.procesos_ids.includes(pr.id);
                return (
                  <button key={pr.id} type="button" onClick={() => toggleProc(pr.id)} style={{ height: 26, padding: "0 10px", borderRadius: 999, border: `1px solid ${sel ? theme.accent : theme.border}`, background: sel ? theme.accent : "transparent", color: sel ? "#fff" : theme.inkSoft, fontSize: 11.5, fontFamily: "inherit", cursor: "pointer" }}>
                    {pr.codigo} · {pr.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {f.tipo === "Personas" && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: theme.r.md, background: "rgba(96,165,250,0.10)", border: `1px solid ${theme.info}40`, fontSize: 11.5, color: theme.info }}>
            ⓘ Los activos tipo &quot;Personas&quot; se anonimizan antes de ir al RAG (decisión PO sobre privacidad / Ley 29733).
          </div>
        )}
        {err && Object.keys(fieldErrs).length === 0 && <div style={{ marginTop: 12 }}><ErrorBox msg={err} /></div>}
        <ModalActions saving={saving} mode={mode} canDelete={canDelete} onDelete={del} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

