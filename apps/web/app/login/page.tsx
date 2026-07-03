"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuroraBg, Card, Logo, Field, Button, Icon, theme } from "@/lib/ui";

// HU01 / Fase 2 — Login con credenciales y con cuenta empresarial (Entra ID).
// El botón Entra real aparece solo si el provider está configurado; en dev sin
// Entra se ofrece el flujo Microsoft simulado como respaldo.

// Mensajes de error que devuelve el callback signIn de Entra (lib/auth/entra-provision).
const ENTRA_ERRORS: Record<string, string> = {
  org_no_habilitada: "Tu organización aún no está habilitada. Pide a tu administrador que complete el alta con Microsoft Entra.",
  dominio_no_coincide: "El dominio de tu cuenta no coincide con el registrado para tu organización.",
  conflicto_email_otra_org: "Tu correo ya está registrado en otra organización.",
  usuario_inactivo: "Tu usuario está inactivo. Contacta a tu administrador.",
  claims_incompletos: "No se pudieron leer los datos de tu cuenta Microsoft.",
  org_no_encontrada: "Tu organización no tiene una configuración válida. Contacta al soporte.",
};
const ONBOARD_ERRORS: Record<string, string> = {
  state_invalido: "El enlace de alta expiró o es inválido. Inicia el alta nuevamente.",
  consent_no_otorgado: "No se otorgó el consentimiento de administrador.",
  directorio_ya_registrado: "Ese directorio de Microsoft ya está vinculado a otra organización.",
  error_interno: "Ocurrió un error al completar el alta. Intenta de nuevo.",
};

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const justRegistered = params.get("registered");
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [tab, setTab] = useState<"credentials" | "microsoft">("credentials");
  const [email, setEmail] = useState(justRegistered ?? "");
  const [password, setPassword] = useState("");
  const [msEmail, setMsEmail] = useState(justRegistered ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entraEnabled, setEntraEnabled] = useState(false);

  // Mensajes de la URL (errores de Entra / resultado del onboarding).
  const onboarded = params.get("onboarded");
  const entraError = params.get("error");
  const onboardError = params.get("onboard_error");
  const urlError = entraError
    ? (ENTRA_ERRORS[entraError] ?? "No se pudo iniciar sesión con tu cuenta empresarial.")
    : onboardError
      ? (ONBOARD_ERRORS[onboardError] ?? decodeURIComponent(onboardError))
      : null;

  // ¿Está configurado el provider Entra real? (source of truth: /api/auth/providers)
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((p) => setEntraEnabled(!!p && "microsoft-entra-id" in p))
      .catch(() => setEntraEnabled(false));
  }, []);

  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Ingresa correo y contraseña"); return; }
    setLoading(true);
    const res = await signIn("credentials", { email: email.trim().toLowerCase(), password, redirect: false, callbackUrl });
    setLoading(false);
    if (!res || res.error) { setError("Correo o contraseña incorrectos"); return; }
    router.push(callbackUrl);
    router.refresh();
  };

  // Entra real: redirección OIDC (no inline). Auth.js maneja el round-trip.
  const handleEntra = () => {
    setLoading(true);
    void signIn("microsoft-entra-id", { callbackUrl });
  };

  // Fallback dev: Microsoft simulado (email).
  const handleMsSimulated = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!msEmail) { setError("Ingresa el correo de tu cuenta Microsoft"); return; }
    setLoading(true);
    const res = await signIn("ms-simulated", { email: msEmail.trim().toLowerCase(), redirect: false, callbackUrl });
    setLoading(false);
    if (!res || res.error) { setError("Cuenta Microsoft no encontrada o no vinculada."); return; }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", color: theme.ink }}>
      <AuroraBg />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}><Logo size={34} /></div>

          <Card padding={32}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em", margin: 0 }}>Iniciar sesión</h2>
              <p style={{ fontSize: 13, color: theme.inkSoft, marginTop: 6 }}>Accede a tu SGSI Platform</p>
            </div>

            {justRegistered && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: theme.r.md, background: "rgba(52,211,153,0.12)", border: `1px solid ${theme.success}40`, color: theme.success, fontSize: 12.5 }}>
                ✓ Organización registrada. Ingresa con la cuenta de administrador.
              </div>
            )}
            {onboarded && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: theme.r.md, background: "rgba(52,211,153,0.12)", border: `1px solid ${theme.success}40`, color: theme.success, fontSize: 12.5 }}>
                ✓ Organización habilitada con Microsoft Entra. Ya puedes ingresar con tu cuenta empresarial.
              </div>
            )}
            {urlError && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12.5 }}>
                {urlError}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "inline-flex", padding: 4, background: "rgba(0,0,0,0.3)", borderRadius: theme.r.md, gap: 2, marginBottom: 18, width: "100%", justifyContent: "stretch" }}>
              {(["credentials", "microsoft"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setTab(t); setError(null); }}
                  style={{ flex: 1, height: 28, borderRadius: 8, border: "none", background: tab === t ? theme.surfaceSolid : "transparent", color: tab === t ? theme.ink : theme.inkMuted, fontSize: 12, fontWeight: tab === t ? 600 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                  {t === "credentials" ? "Email + contraseña" : "Cuenta empresarial"}
                </button>
              ))}
            </div>

            {tab === "credentials" && (
              <form onSubmit={handleCredentials}>
                <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                  <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} required autoComplete="email" />
                  <Field label="Contraseña" type="password" value={password} onChange={setPassword} required autoComplete="current-password" />
                </div>
                {error && <div style={{ marginBottom: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{error}</div>}
                <Button type="submit" variant="primary" full disabled={loading}>{loading ? "Ingresando…" : "Iniciar sesión"}</Button>
              </form>
            )}

            {tab === "microsoft" && (
              <div>
                {entraEnabled ? (
                  <>
                    <button type="button" onClick={handleEntra} disabled={loading}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: theme.r.md, background: theme.surfaceSolid, border: `1px solid ${theme.borderStrong}`, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 12 }}>
                      <Icon name="msft" size={20} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Continuar con cuenta empresarial</div>
                        <div style={{ fontSize: 11, color: theme.inkMuted }}>Microsoft Entra ID · SSO</div>
                      </div>
                      <Icon name="arrowR" size={15} color={theme.inkSoft} />
                    </button>
                    <div style={{ fontSize: 11, color: theme.inkMuted, textAlign: "center" }}>
                      Usa tu cuenta de trabajo. Tu organización debe estar habilitada por su administrador.
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleMsSimulated}>
                    <button type="submit" disabled={loading}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: theme.r.md, background: theme.surfaceSolid, border: `1px solid ${theme.borderStrong}`, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 14 }}>
                      <Icon name="msft" size={20} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>Continuar con Microsoft</div>
                        <div style={{ fontSize: 11, color: theme.inkMuted }}>Azure AD · SSO (simulado · dev)</div>
                      </div>
                      <Icon name="arrowR" size={15} color={theme.inkSoft} />
                    </button>
                    <div style={{ marginBottom: 14 }}>
                      <Field label="Correo de tu cuenta Microsoft" type="email" value={msEmail} onChange={setMsEmail} required autoComplete="email" hint="Entorno de desarrollo: la cuenta debe estar vinculada (HU05)" />
                    </div>
                    {error && <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{error}</div>}
                  </form>
                )}
              </div>
            )}
          </Card>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, lineHeight: 1.9 }}>
            <div>
              <span style={{ color: theme.inkSoft }}>¿Aún no registras tu organización?</span>{" "}
              <a href="/registro" style={{ color: theme.accentDeep, fontWeight: 600, textDecoration: "none" }}>Crear con email</a>
            </div>
            {entraEnabled && (
              <div>
                <span style={{ color: theme.inkSoft }}>¿Tu empresa usa Microsoft Entra?</span>{" "}
                <a href="/onboarding" style={{ color: theme.accentDeep, fontWeight: 600, textDecoration: "none" }}>Conectar organización</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
