import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AppShell } from "@/app/_components/app-shell";
import { revisionPendiente } from "@/lib/alcance-revision";
import { AlcanceBanner } from "@/app/_components/alcance-banner";
import { RiesgosClient } from "./riesgos-client";

// M3 Riesgos — HU60 escenarios, HU61 sugeridor IA (4 dominios), análisis,
// matriz N×N y criterios de riesgo (Cláusula 6.1 ISO/IEC 27001:2022).
export default async function RiesgosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "riesgo", "read")) {
    redirect("/dashboard?forbidden=riesgo:read");
  }

  const orgId = session.user.organizacion_id;
  const [escenarios, org] = await Promise.all([
    prisma.escenarioRiesgo.findMany({
      where: { organizacion_id: orgId, deleted_at: null },
      select: {
        id: true, codigo: true, nombre: true, descripcion: true, amenaza: true,
        vulnerabilidad: true, dominio: true, origen: true, justificacion_ia: true,
        estado: true,
        riesgos: {
          where: { deleted_at: null },
          select: {
            id: true, escenario_riesgo_id: true, codigo: true, nombre: true, descripcion: true,
            probabilidad_inicial: true, impacto_inicial: true, nivel_inicial: true,
            tratamiento: true, probabilidad_actual: true, impacto_actual: true,
            nivel_actual: true, origen: true, estado: true,
            aceptado_por_at: true,
            aceptado_por: { select: { nombre: true, correo: true } },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.organizacion.findUnique({
      where: { id: orgId },
      select: { criterio_riesgo_p: true, criterio_riesgo_i: true, apetito_riesgo: true, tolerancia_riesgo: true },
    }),
  ]);

  const perms = {
    escenario_create: can(session.user.rol, "escenario", "create"),
    escenario_update: can(session.user.rol, "escenario", "update"),
    escenario_delete: can(session.user.rol, "escenario", "delete"),
    riesgo_create: can(session.user.rol, "riesgo", "create"),
    riesgo_update: can(session.user.rol, "riesgo", "update"),
    riesgo_delete: can(session.user.rol, "riesgo", "delete"),
    criterios_update: can(session.user.rol, "organizacion", "update"),
  };

  const rev = await revisionPendiente(orgId, "riesgos");

  return (
    <AppShell current="riesgos">
      {rev.pendiente && rev.modificadoAt && (
        <AlcanceBanner
          modulo="riesgos"
          modificadoAt={rev.modificadoAt}
          canReview={perms.criterios_update}
          nota="Reevalúa el análisis de riesgos: nuevos activos/procesos en el alcance pueden introducir o modificar riesgos (ISO 27001 · 8.2/8.3)."
        />
      )}
      <RiesgosClient
        sessionRol={session.user.rol}
        escenariosInicial={escenarios}
        criteriosInicial={{
          maxProb: org?.criterio_riesgo_p ?? 5,
          maxImpact: org?.criterio_riesgo_i ?? 5,
          apetito: org?.apetito_riesgo ?? null,
          tolerancia: org?.tolerancia_riesgo ?? null,
        }}
        perms={perms}
      />
    </AppShell>
  );
}
