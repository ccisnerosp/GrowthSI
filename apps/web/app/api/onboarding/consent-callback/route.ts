// Fase 1 — Callback del admin-consent de Entra. El directorio de la PYME redirige
// aquí tras consentir. Capturamos su `tid` (query 'tenant') y marcamos el Tenant
// de GrowthSI como consentido. A partir de aquí sus usuarios entran por JIT.

import { type NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyOnboardingState } from "@/lib/auth/onboarding-state";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const qp = url.searchParams;
  const base = process.env.AUTH_URL ?? url.origin;
  const redirect = (q: string) => NextResponse.redirect(`${base}/login?${q}`);

  if (qp.get("error")) {
    return redirect(`onboard_error=${encodeURIComponent(qp.get("error_description") ?? qp.get("error") ?? "consent_error")}`);
  }

  const tenantId = verifyOnboardingState(qp.get("state"));
  if (tenantId === null) return redirect("onboard_error=state_invalido");

  const tid = qp.get("tenant"); // el `tid` del directorio que consintió
  const granted = qp.get("admin_consent") === "True";
  if (!tid || !granted) return redirect("onboard_error=consent_no_otorgado");

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { entra_tenant_id: tid, consent_status: "granted", consent_granted_at: new Date() },
    });
  } catch (e) {
    // entra_tenant_id es único: si ese directorio ya está mapeado a otro Tenant.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return redirect("onboard_error=directorio_ya_registrado");
    }
    console.error("[api/onboarding/consent-callback] error", e);
    return redirect("onboard_error=error_interno");
  }

  return redirect("onboarded=1");
}
