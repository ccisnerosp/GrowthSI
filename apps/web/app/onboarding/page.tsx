"use client";

import { useState, type FormEvent } from "react";
import { AuroraBg, Card, Logo, Field, Button, theme } from "@/lib/ui";

// Fase 2 — Alta de organización con Microsoft Entra (admin consent).
// Recoge los datos de la organización + dominio corporativo, llama a
// /api/onboarding/start y redirige al admin a la URL de admin-consent de Microsoft.

const ESTADOS_SGSI = ["Diagnóstico", "Planificación", "Implementación", "Operación", "Certificado"] as const;

const inputStyle: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px", borderRadius: theme.r.md,
  border: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.25)", color: theme.ink,
  fontSize: 13, fontFamily: "inherit", outline: "none",
};
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 6 };

export default function OnboardingPage() {
  const [f, setF] = useState({
    nombre_organizacion: "", ruc: "", sector: "", numero_colaboradores: "",
    dominio: "", mision: "", vision: "", estado_sgsi: "Diagnóstico", inicio_proyecto: "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/onboarding/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, numero_colaboradores: Number(f.numero_colaboradores) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "No se pudo iniciar el alta.");
        setLoading(false);
        return;
      }
      // Redirige al consentimiento de administrador de Microsoft (flujo externo).
      window.location.href = body.consent_url as string;
    } catch {
      setError("No se pudo conectar al servidor.");
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", color: theme.ink }}>
      <AuroraBg />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><Logo size={32} /></div>
          <Card padding={32}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 21, fontWeight: 600, margin: 0 }}>Conectar organización con Microsoft Entra</h2>
              <p style={{ fontSize: 13, color: theme.inkSoft, marginTop: 6 }}>
                Al finalizar, el administrador de TI otorgará el consentimiento en su directorio. Los usuarios ingresarán con su cuenta empresarial.
              </p>
            </div>

            <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
              <Field label="Nombre de la organización" value={f.nombre_organizacion} onChange={set("nombre_organizacion")} required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="RUC (11 dígitos)" value={f.ruc} onChange={set("ruc")} required />
                <Field label="Dominio corporativo" value={f.dominio} onChange={set("dominio")} required hint="p. ej. miempresa.com (gate de vinculación)" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Sector" value={f.sector} onChange={set("sector")} required />
                <Field label="N° de colaboradores" type="number" value={f.numero_colaboradores} onChange={set("numero_colaboradores")} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Estado del SGSI</label>
                  <select style={inputStyle} value={f.estado_sgsi} onChange={(e) => set("estado_sgsi")(e.target.value)}>
                    {ESTADOS_SGSI.map((s) => <option key={s} value={s} style={{ background: theme.surfaceSolid }}>{s}</option>)}
                  </select>
                </div>
                <Field label="Inicio del proyecto" type="date" value={f.inicio_proyecto} onChange={set("inicio_proyecto")} required />
              </div>
              <div>
                <label style={labelStyle}>Misión</label>
                <textarea style={{ ...inputStyle, height: "auto", minHeight: 60, padding: "10px 12px" }} value={f.mision} onChange={(e) => set("mision")(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Visión</label>
                <textarea style={{ ...inputStyle, height: "auto", minHeight: 60, padding: "10px 12px" }} value={f.vision} onChange={(e) => set("vision")(e.target.value)} />
              </div>

              {error && <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{error}</div>}

              <Button type="submit" variant="primary" full disabled={loading}>
                {loading ? "Redirigiendo a Microsoft…" : "Continuar al consentimiento de administrador"}
              </Button>
            </form>
          </Card>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
            <a href="/login" style={{ color: theme.accentDeep, fontWeight: 600, textDecoration: "none" }}>← Volver a iniciar sesión</a>
          </div>
        </div>
      </div>
    </div>
  );
}
