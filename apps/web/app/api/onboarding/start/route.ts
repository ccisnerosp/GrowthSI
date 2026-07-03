// Fase 1 — Onboarding de una organización que usará Entra ID (admin consent).
// Crea (Tenant + Organización) en estado consent='pending' SIN usuario/password:
// el admin se provisiona como Administrador al primer login Entra (post-consent).
// Devuelve la URL de ADMIN CONSENT de la app multi-tenant.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { signOnboardingState } from "@/lib/auth/onboarding-state";

const ESTADOS_SGSI = ["Diagnóstico", "Planificación", "Implementación", "Operación", "Certificado"] as const;

const schema = z.object({
  nombre_organizacion:  z.string().trim().min(2).max(180),
  ruc:                  z.string().regex(/^\d{11}$/),
  sector:               z.string().trim().min(1),
  numero_colaboradores: z.coerce.number().int().min(1).max(1_000_000),
  dominio:              z.string().trim().min(3).max(120), // dominio corporativo (gate de linking D4)
  mision:               z.string().trim().min(10),
  vision:               z.string().trim().min(10),
  estado_sgsi:          z.enum(ESTADOS_SGSI),
  inicio_proyecto:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  if (!process.env.ENTRA_CLIENT_ID) {
    return NextResponse.json({ error: "Entra ID no está configurado en el servidor." }, { status: 503 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Hay campos con errores", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  const d = parsed.data;

  const existRuc = await prisma.organizacion.findUnique({ where: { ruc: d.ruc }, select: { id: true } });
  if (existRuc) return NextResponse.json({ error: "El RUC ya está registrado" }, { status: 409 });

  const orgCount = await prisma.organizacion.count();
  const codigo = `ORG-${String(orgCount + 1).padStart(3, "0")}`;

  try {
    const { tenantId, organizacionId } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: d.nombre_organizacion, plan: "Trial", activo: true,
          auth_method: "entra", consent_status: "pending", default_rol_jit: "Auditor",
        },
      });
      const organizacion = await tx.organizacion.create({
        data: {
          tenant_id: tenant.id, codigo,
          nombre_organizacion: d.nombre_organizacion, ruc: d.ruc, sector: d.sector,
          numero_colaboradores: d.numero_colaboradores, dominio: d.dominio.toLowerCase(),
          mision: d.mision, vision: d.vision, estado_sgsi: d.estado_sgsi,
          inicio_proyecto: new Date(d.inicio_proyecto + "T00:00:00Z"), estado: "activo",
        },
      });
      return { tenantId: tenant.id, organizacionId: organizacion.id };
    });

    // URL de admin-consent de la app multi-tenant (el admin de la PYME la abre).
    const base = process.env.AUTH_URL ?? new URL(req.url).origin;
    const state = signOnboardingState(tenantId);
    const consentUrl =
      `https://login.microsoftonline.com/organizations/v2.0/adminconsent` +
      `?client_id=${encodeURIComponent(process.env.ENTRA_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(`${base}/api/onboarding/consent-callback`)}` +
      `&scope=${encodeURIComponent("openid profile email")}` +
      `&state=${encodeURIComponent(state)}`;

    return NextResponse.json({ ok: true, tenant_id: tenantId, organizacion_id: organizacionId, consent_url: consentUrl }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Conflicto de unicidad" }, { status: 409 });
    }
    console.error("[api/onboarding/start] error", e);
    return NextResponse.json({ error: "No se pudo iniciar el onboarding" }, { status: 500 });
  }
}
