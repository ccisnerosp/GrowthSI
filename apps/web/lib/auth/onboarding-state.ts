// State firmado para el flujo de admin-consent de Entra (sin tabla nueva).
// Formato: "<tenantId>.<emitidoMs>.<hmac>" firmado con AUTH_SECRET.

import crypto from "crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hora

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-insecure-secret";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Firma un state para un Tenant de GrowthSI recién creado (pendiente de consent). */
export function signOnboardingState(tenantId: number): string {
  const payload = `${tenantId}.${new Date().getTime()}`;
  return `${payload}.${sign(payload)}`;
}

/** Verifica el state; devuelve el tenantId si es válido y no expiró, o null. */
export function verifyOnboardingState(state: string | null | undefined): number | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [tid, ts, mac] = parts;
  const payload = `${tid}.${ts}`;
  const expected = sign(payload);
  // Comparación en tiempo constante.
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const emitido = Number(ts);
  if (!Number.isFinite(emitido) || new Date().getTime() - emitido > TTL_MS) return null;
  const tenantId = Number(tid);
  return Number.isInteger(tenantId) ? tenantId : null;
}
