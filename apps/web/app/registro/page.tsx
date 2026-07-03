"use client";

import { useState, type FormEvent, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { AuroraBg, Card, Logo, Field, Select, Button, Icon, theme } from "@/lib/ui";

// HU02 — Registrar organización (Administrador) — wizard 2 pasos.

type Form = {
  nombre_organizacion: string;
  ruc: string;
  sector: string;
  numero_colaboradores: string;
  dominio: string;
  mision: string;
  vision: string;
  estado_sgsi: string;
  inicio_proyecto: string;
  admin_nombre: string;
  admin_correo: string;
  admin_password: string;
  admin_password_confirm: string;
};

const SECTORES = [
  "Logística y transporte",
  "Banca y finanzas",
  "Salud",
  "Retail",
  "Tecnología",
  "Educación",
  "Manufactura",
  "Servicios",
];

const ESTADOS_SGSI = ["Diagnóstico", "Planificación", "Implementación", "Operación", "Certificado"];

const TODAY = new Date().toISOString().slice(0, 10);

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Form>({
    nombre_organizacion: "",
    ruc: "",
    sector: "",
    numero_colaboradores: "",
    dominio: "",
    mision: "",
    vision: "",
    estado_sgsi: "Diagnóstico",
    inicio_proyecto: TODAY,
    admin_nombre: "",
    admin_correo: "",
    admin_password: "",
    admin_password_confirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof Form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setGlobalError(null);
  };

  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof Form, string>> = {};
    if (form.nombre_organizacion.trim().length < 2) errs.nombre_organizacion = "Mínimo 2 caracteres";
    if (!/^\d{11}$/.test(form.ruc)) errs.ruc = "El RUC debe tener 11 dígitos";
    if (!form.sector) errs.sector = "Selecciona un sector";
    const n = Number(form.numero_colaboradores);
    if (!Number.isInteger(n) || n < 1) errs.numero_colaboradores = "Mínimo 1 colaborador";
    if (form.dominio.trim().length < 3) errs.dominio = "Dominio inválido";
    if (form.mision.trim().length < 10) errs.mision = "Mínimo 10 caracteres";
    if (form.vision.trim().length < 10) errs.vision = "Mínimo 10 caracteres";
    if (!form.inicio_proyecto) errs.inicio_proyecto = "Fecha requerida";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof Form, string>> = {};
    if (form.admin_nombre.trim().length < 2) errs.admin_nombre = "Mínimo 2 caracteres";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_correo)) errs.admin_correo = "Correo inválido";
    if (form.admin_password.length < 8) errs.admin_password = "Mínimo 8 caracteres";
    if (form.admin_password !== form.admin_password_confirm) errs.admin_password_confirm = "Las contraseñas no coinciden";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_organizacion: form.nombre_organizacion.trim(),
          ruc: form.ruc,
          sector: form.sector,
          numero_colaboradores: Number(form.numero_colaboradores),
          dominio: form.dominio.trim(),
          mision: form.mision.trim(),
          vision: form.vision.trim(),
          estado_sgsi: form.estado_sgsi,
          inicio_proyecto: form.inicio_proyecto,
          admin_nombre: form.admin_nombre.trim(),
          admin_correo: form.admin_correo.trim(),
          admin_password: form.admin_password,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          issues?: Array<{ path: string; message: string }>;
        };
        if (body.issues) {
          const map: Partial<Record<keyof Form, string>> = {};
          for (const i of body.issues) map[i.path as keyof Form] = i.message;
          setErrors(map);
          if (Object.keys(map).some((k) => ["nombre_organizacion", "ruc", "sector", "numero_colaboradores", "dominio", "mision", "vision", "inicio_proyecto"].includes(k))) {
            setStep(1);
          }
        }
        setGlobalError(body.error ?? "Error al registrar");
        setLoading(false);
        return;
      }
      router.push(`/login?registered=${encodeURIComponent(form.admin_correo)}`);
    } catch (err) {
      console.error(err);
      setGlobalError("No se pudo conectar al servidor. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const stepperStyle: CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 22 };
  const dotStyle = (n: number, active: boolean, done: boolean): CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: 999,
    background: active || done ? theme.accent : "rgba(255,255,255,0.08)",
    color: active || done ? "#fff" : theme.inkMuted,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    transition: "all .2s",
  });
  const lineStyle = (done: boolean): CSSProperties => ({
    width: 72,
    height: 2,
    background: done ? theme.accent : "rgba(255,255,255,0.08)",
    borderRadius: 999,
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", color: theme.ink }}>
      <AuroraBg />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 720 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <Logo size={36} />
          </div>

          <div style={stepperStyle}>
            <div style={dotStyle(1, step === 1, step > 1)}>
              {step > 1 ? <Icon name="check" size={13} /> : 1}
            </div>
            <div style={lineStyle(step > 1)} />
            <div style={dotStyle(2, step === 2, false)}>2</div>
          </div>

          <Card padding={32}>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.accent, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              Paso {step} de 2
            </div>

            {step === 1 && (
              <form onSubmit={handleNext}>
                <h2 style={{ fontSize: 24, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em", margin: 0 }}>
                  Datos de tu organización
                </h2>
                <p style={{ fontSize: 13.5, color: theme.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
                  Registrarás un nuevo tenant en la plataforma. La información se aísla por organización.
                </p>

                <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                    <Field label="Razón social" required value={form.nombre_organizacion} onChange={set("nombre_organizacion")} error={errors.nombre_organizacion} placeholder="LogiNorte SAC" />
                    <Field label="RUC" required value={form.ruc} onChange={set("ruc")} error={errors.ruc} placeholder="20512345678" hint="11 dígitos" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <Select label="Sector" required value={form.sector} onChange={set("sector")} options={SECTORES} />
                      {errors.sector && <span style={{ fontSize: 11, color: theme.danger, marginTop: 4, display: "block" }}>{errors.sector}</span>}
                    </div>
                    <Field label="N° colaboradores" type="number" required value={form.numero_colaboradores} onChange={set("numero_colaboradores")} error={errors.numero_colaboradores} placeholder="200" />
                    <Field label="Dominio corporativo" required value={form.dominio} onChange={set("dominio")} error={errors.dominio} placeholder="empresa.com.pe" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <Select label="Estado del SGSI" required value={form.estado_sgsi} onChange={set("estado_sgsi")} options={ESTADOS_SGSI} />
                    </div>
                    <Field label="Inicio de proyecto" type="date" required value={form.inicio_proyecto} onChange={set("inicio_proyecto")} error={errors.inicio_proyecto} />
                  </div>
                  <TextArea label="Misión" required value={form.mision} onChange={set("mision")} error={errors.mision} placeholder="Brindar..." />
                  <TextArea label="Visión" required value={form.vision} onChange={set("vision")} error={errors.vision} placeholder="Ser referente..." />
                </div>

                {globalError && (
                  <div style={{ marginTop: 16, padding: 12, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12.5 }}>
                    {globalError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
                  <Button variant="ghost" onClick={() => router.push("/")}>Volver al inicio</Button>
                  <Button type="submit" variant="primary" icon={<Icon name="arrowR" size={14} />}>Continuar</Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontSize: 24, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em", margin: 0 }}>
                  Crea tu cuenta de Administrador
                </h2>
                <p style={{ fontSize: 13.5, color: theme.inkSoft, marginTop: 8 }}>
                  Esta cuenta tendrá control total del tenant <strong style={{ color: theme.ink }}>{form.nombre_organizacion}</strong>.
                </p>

                <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
                  <Field label="Nombre completo" required value={form.admin_nombre} onChange={set("admin_nombre")} error={errors.admin_nombre} placeholder="Andrea Vargas" autoComplete="name" />
                  <Field label="Correo corporativo" type="email" required value={form.admin_correo} onChange={set("admin_correo")} error={errors.admin_correo} placeholder={`admin@${form.dominio || "empresa.com"}`} autoComplete="email" />
                  <Field label="Contraseña" type="password" required value={form.admin_password} onChange={set("admin_password")} error={errors.admin_password} hint="Mínimo 8 caracteres" autoComplete="new-password" />
                  <Field label="Confirmar contraseña" type="password" required value={form.admin_password_confirm} onChange={set("admin_password_confirm")} error={errors.admin_password_confirm} autoComplete="new-password" />
                </div>

                {globalError && (
                  <div style={{ marginTop: 16, padding: 12, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12.5 }}>
                    {globalError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
                  <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
                  <Button type="submit" variant="primary" disabled={loading} icon={<Icon name="check" size={14} />}>
                    {loading ? "Registrando…" : "Registrar"}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a href="/login" style={{ color: theme.inkSoft, fontSize: 12, textDecoration: "none" }}>
              ¿Ya tienes cuenta? <span style={{ color: theme.accentDeep, fontWeight: 600 }}>Iniciar sesión</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, error, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; required?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft, letterSpacing: "-0.005em" }}>
        {label}
        {required && <span style={{ color: theme.danger, marginLeft: 4 }}>*</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={3}
        style={{
          padding: "10px 12px",
          borderRadius: theme.r.md,
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${error ? theme.danger : theme.border}`,
          color: theme.ink,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          resize: "vertical",
          minHeight: 70,
          lineHeight: 1.5,
        }}
      />
      {error && <span style={{ fontSize: 11, color: theme.danger }}>{error}</span>}
    </label>
  );
}
