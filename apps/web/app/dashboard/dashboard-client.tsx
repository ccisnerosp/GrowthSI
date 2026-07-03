"use client";

import { useRouter } from "next/navigation";
import { Card, Badge, Icon, theme } from "@/lib/ui";

// ── Tipos del payload (espejo de page.tsx) ────────────────────────────────
type TopRiesgo = { codigo: string; nombre: string; nivel: number; band: string };
type Data = {
  estadoSgsi: string; maxScore: number; apetito: number | null; tolerancia: number | null;
  madurez: number;
  anexo: { total: number; aplican: number; implementados: number; parciales: number; generados: number; porTema: Array<{ dominio: string; total: number; aplican: number; implementados: number }> };
  riesgos: { total: number; porRevisar: number; niveles: Record<string, number>; tratamiento: Record<string, number>; fueraTol: number | null; top: TopRiesgo[] };
  documentos: { total: number; vigentes: number; estados: Record<string, number>; obligatorios: number };
  obligatorios: { total: number; cubiertos: number; faltantes: number; pct: number };
  auditorias: { total: number; estados: Record<string, number>; proxima: { codigo: string; nombre: string; fecha: string } | null; halAbiertos: number; halCriticos: number };
  nc: { total: number; abiertas: number; vencidas: number; criticas: number; porEstado: Array<{ estado: string; n: number }> };
  pendientes: { aprobaciones: number; riesgosPorRevisar: number; controlesPorRevisar: number; docsRevision: number; ncVencidas: number; alcanceRevision: number };
};

const BAND = { critico: { label: "Crítico", color: theme.danger }, alto: { label: "Alto", color: theme.warn }, medio: { label: "Medio", color: theme.info }, bajo: { label: "Bajo", color: theme.success } } as Record<string, { label: string; color: string }>;
const NC_LABEL: Record<string, string> = { identificada: "Identificada", analisis: "Análisis", plan: "Plan", ejecucion: "Ejecución", cerrada: "Cerrada" };

export function DashboardClient({ nombre, rol, data }: { nombre: string; rol: string; data: Data }) {
  const router = useRouter();
  const d = data;
  const go = (href: string) => router.push(href);

  const pend = d.pendientes;
  const totalPend = pend.aprobaciones + pend.riesgosPorRevisar + pend.controlesPorRevisar + pend.docsRevision + pend.ncVencidas + d.obligatorios.faltantes + pend.alcanceRevision;

  const nivelSegments = (["critico", "alto", "medio", "bajo"] as const).map((b) => ({ label: BAND[b].label, value: d.riesgos.niveles[b] ?? 0, color: BAND[b].color }));
  const tratMax = Math.max(1, ...Object.values(d.riesgos.tratamiento));

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Hola, {nombre.split(" ")[0]}</div>
          <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>Panel ejecutivo del SGSI · {d.estadoSgsi || "estado no definido"} · rol {rol}</div>
        </div>
        {d.auditorias.proxima && (
          <div style={{ fontSize: 11.5, color: theme.inkSoft, textAlign: "right" }}>
            <span style={{ color: theme.inkMuted }}>Próxima auditoría:</span> <strong>{d.auditorias.proxima.codigo}</strong> · {d.auditorias.proxima.fecha}
          </div>
        )}
      </div>

      {/* ── Fila 1: KPIs ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card padding={18} onClick={() => go("/soa")} hover style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
          <Ring pct={d.madurez} color={theme.accent} />
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Madurez del SGSI</div>
            <div style={{ fontSize: 12, color: theme.inkSoft, marginTop: 6, lineHeight: 1.5 }}>{d.anexo.implementados} de {d.anexo.aplican} controles aplicables implementados</div>
          </div>
        </Card>
        <Kpi label="Cobertura Anexo A" value={`${d.anexo.aplican}/${d.anexo.total}`} sub={`${d.anexo.implementados} implementados${d.anexo.parciales ? ` · ${d.anexo.parciales} parciales` : ""}`} icon="shield" onClick={() => go("/soa")} />
        <Kpi label="Riesgos registrados" value={d.riesgos.total} sub={d.riesgos.fueraTol != null ? `${d.riesgos.fueraTol} fuera de tolerancia` : `${d.riesgos.niveles.critico ?? 0} críticos`} tone={(d.riesgos.fueraTol ?? d.riesgos.niveles.critico ?? 0) > 0 ? "danger" : undefined} icon="alert" onClick={() => go("/riesgos")} />
        <Kpi label="No conformidades" value={d.nc.abiertas} sub={d.nc.vencidas > 0 ? `${d.nc.vencidas} vencidas` : `${d.nc.total} totales`} tone={d.nc.vencidas > 0 ? "danger" : undefined} icon="flag" onClick={() => go("/nc")} />
      </div>

      {/* ── Fila 2: Anexo A por tema + Riesgos ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card padding={20}>
          <PanelTitle title="Anexo A — implementación por tema" sub={`${d.anexo.implementados}/${d.anexo.aplican} aplicables · ${d.anexo.total} en el estándar`} onMore={() => go("/soa")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {d.anexo.porTema.map((t) => {
              const pct = t.aplican > 0 ? Math.round((t.implementados / t.aplican) * 100) : 0;
              return (
                <div key={t.dominio}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11.5 }}>
                    <span style={{ color: theme.inkSoft }}>{t.dominio}</span>
                    <span style={{ color: theme.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{pct}% <span style={{ color: theme.inkMuted, fontWeight: 400 }}>· {t.implementados}/{t.aplican} de {t.total}</span></span>
                  </div>
                  <Track pct={pct} color={theme.accent} />
                </div>
              );
            })}
            {d.anexo.aplican === 0 && <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: "italic" }}>Aún no defines controles aplicables. Hazlo en la SoA.</div>}
          </div>
        </Card>

        <Card padding={20}>
          <PanelTitle title="Riesgos por nivel" sub={`${d.riesgos.total} registrados${d.riesgos.porRevisar ? ` · ${d.riesgos.porRevisar} por revisar` : ""}`} onMore={() => go("/riesgos")} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8 }}>
            <Donut segments={nivelSegments} centerTop={String(d.riesgos.total)} centerSub="riesgos" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {nivelSegments.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                  <span style={{ color: theme.inkSoft, flex: 1 }}>{s.label}</span>
                  <span style={{ color: theme.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: 14, paddingTop: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Tratamiento</div>
            {(["mitigar", "transferir", "aceptar", "evitar"] as const).map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ width: 70, fontSize: 11, color: theme.inkSoft, textTransform: "capitalize" }}>{k}</span>
                <div style={{ flex: 1 }}><Track pct={Math.round(((d.riesgos.tratamiento[k] ?? 0) / tratMax) * 100)} color={theme.accentDeep} thin /></div>
                <span style={{ width: 18, textAlign: "right", fontSize: 11, color: theme.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.riesgos.tratamiento[k] ?? 0}</span>
              </div>
            ))}
            {d.apetito != null && d.tolerancia != null && (
              <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 8 }}>Apetito ≤ {d.apetito} · Tolerancia ≤ {d.tolerancia} (de {d.maxScore})</div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Fila 3: Top riesgos + NC + Pendientes ───────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Card padding={20}>
          <PanelTitle title="Top riesgos por nivel" onMore={() => go("/riesgos")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {d.riesgos.top.length === 0 ? <Empty text="Sin riesgos registrados." /> : d.riesgos.top.map((r) => (
              <div key={r.codigo} style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: theme.inkMuted, fontFamily: "ui-monospace,monospace" }}>{r.codigo}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: theme.ink, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre}</div>
                </div>
                <Badge tone={r.band === "critico" ? "danger" : r.band === "alto" ? "warn" : r.band === "medio" ? "info" : "success"}>{r.nivel}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card padding={20}>
          <PanelTitle title="No conformidades" sub={`${d.nc.abiertas} abiertas · ${d.nc.criticas} críticas`} onMore={() => go("/nc")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
            {d.nc.porEstado.map((c) => {
              const max = Math.max(1, ...d.nc.porEstado.map((x) => x.n));
              return (
                <div key={c.estado} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 78, fontSize: 11, color: theme.inkSoft }}>{NC_LABEL[c.estado]}</span>
                  <div style={{ flex: 1 }}><Track pct={Math.round((c.n / max) * 100)} color={c.estado === "cerrada" ? theme.success : theme.warn} thin /></div>
                  <span style={{ width: 18, textAlign: "right", fontSize: 11, color: theme.ink, fontWeight: 600 }}>{c.n}</span>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: 12, paddingTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone={d.nc.vencidas > 0 ? "danger" : "neutral"} dot>{d.nc.vencidas} vencidas</Badge>
            <Badge tone="warn" dot>{d.auditorias.halAbiertos} hallazgos abiertos</Badge>
            {d.auditorias.halCriticos > 0 && <Badge tone="danger" dot>{d.auditorias.halCriticos} críticos</Badge>}
          </div>
        </Card>

        <Card padding={20}>
          <PanelTitle title="Acciones pendientes" sub={`${totalPend} en total`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <Action label="Aprobaciones pendientes" n={pend.aprobaciones} tone="warn" onClick={() => go("/alcance")} />
            <Action label="Riesgos por revisar (IA)" n={pend.riesgosPorRevisar} tone="accent" onClick={() => go("/riesgos")} />
            <Action label="Controles por revisar (IA)" n={pend.controlesPorRevisar} tone="accent" onClick={() => go("/soa")} />
            <Action label="Documentos en revisión" n={pend.docsRevision} tone="warn" onClick={() => go("/documentos")} />
            <Action label="No conformidades vencidas" n={pend.ncVencidas} tone="danger" onClick={() => go("/nc")} />
            <Action label="Documentación obligatoria faltante" n={d.obligatorios.faltantes} tone="warn" onClick={() => go("/documentos")} />
            <Action label="Módulos por revisar tras cambio de alcance" n={pend.alcanceRevision} tone="warn" onClick={() => go("/alcance")} />
            {totalPend === 0 && <div style={{ fontSize: 12, color: theme.success, padding: "6px 0" }}>✓ Nada pendiente. Todo al día.</div>}
          </div>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: 12, paddingTop: 10, fontSize: 11, color: theme.inkMuted, display: "flex", flexDirection: "column", gap: 5 }}>
            <div>Info. documentada obligatoria (ISO 27001): <strong style={{ color: d.obligatorios.pct >= 80 ? theme.success : d.obligatorios.pct >= 50 ? theme.warn : theme.danger }}>{d.obligatorios.pct}%</strong> · {d.obligatorios.cubiertos}/{d.obligatorios.total} cubiertos</div>
            <div>Documentos: <strong style={{ color: theme.ink }}>{d.documentos.vigentes}%</strong> vigentes · {d.documentos.estados.aprobado ?? 0}/{d.documentos.total} aprobados</div>
          </div>
        </Card>
      </div>

      <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 14, textAlign: "center" }}>
        Indicadores en tiempo real sobre los datos del SGSI · clic en una tarjeta para ir al módulo.
      </p>
    </div>
  );
}

// ── Componentes ────────────────────────────────────────────────────────────
function PanelTitle({ title, sub, onMore }: { title: string; sub?: string; onMore?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink, letterSpacing: "-0.01em" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      {onMore && <button onClick={onMore} title="Ver módulo" style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", padding: 2 }}><Icon name="arrowR" size={15} /></button>}
    </div>
  );
}

function Kpi({ label, value, sub, tone, icon, onClick }: { label: string; value: number | string; sub: string; tone?: "danger" | "warn" | "success"; icon?: Parameters<typeof Icon>[0]["name"]; onClick?: () => void }) {
  const color = tone === "danger" ? theme.danger : tone === "warn" ? theme.warn : tone === "success" ? theme.success : theme.ink;
  return (
    <Card padding={18} onClick={onClick} hover={!!onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
        {icon && <Icon name={icon} size={15} color={theme.inkMuted} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 4 }}>{sub}</div>
    </Card>
  );
}

function Track({ pct, color, thin }: { pct: number; color: string; thin?: boolean }) {
  return (
    <div style={{ height: thin ? 5 : 7, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

function Action({ label, n, tone, onClick }: { label: string; n: number; tone: "danger" | "warn" | "accent"; onClick: () => void }) {
  const dim = n === 0;
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}`, cursor: "pointer", fontFamily: "inherit", width: "100%", opacity: dim ? 0.55 : 1 }}>
      <span style={{ fontSize: 12, color: theme.inkSoft }}>{label}</span>
      <Badge tone={dim ? "neutral" : tone}>{n}</Badge>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: "italic", padding: "8px 0" }}>{text}</div>;
}

// Anillo (gauge) de un solo valor — SVG puro.
function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 26, c = 2 * Math.PI * r, val = Math.max(0, Math.min(100, pct));
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(val / 100) * c} ${c}`} transform="rotate(-90 34 34)" />
      <text x="34" y="34" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill={theme.ink}>{val}%</text>
    </svg>
  );
}

// Donut de segmentos — SVG puro.
function Donut({ segments, centerTop, centerSub }: { segments: Array<{ label: string; value: number; color: string }>; centerTop: string; centerSub: string }) {
  const r = 30, c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let accDeg = -90;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
      <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
      {total > 0 && segments.map((s) => {
        const frac = s.value / total;
        const seg = <circle key={s.label} cx="46" cy="46" r={r} fill="none" stroke={s.color} strokeWidth="11" strokeDasharray={`${frac * c} ${c}`} transform={`rotate(${accDeg} 46 46)`} />;
        accDeg += frac * 360;
        return seg;
      })}
      <text x="46" y="42" textAnchor="middle" fontSize="17" fontWeight="700" fill={theme.ink}>{centerTop}</text>
      <text x="46" y="57" textAnchor="middle" fontSize="9" fill={theme.inkMuted}>{centerSub}</text>
    </svg>
  );
}
