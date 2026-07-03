import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, Badge, Avatar } from "@/lib/ui";
import { theme } from "@/lib/theme";
import { avatarColorFor } from "@/lib/avatar-color";
import { AppShell } from "@/app/_components/app-shell";
import { MicrosoftLinkButtons } from "./microsoft-link-buttons";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const u = await prisma.usuario.findUnique({
    where: { id: session.user.userId },
    select: {
      id: true,
      nombre: true,
      correo: true,
      funcion: true,
      rol: true,
      area: true,
      mfa_activo: true,
      azure_oid: true,
      ultimo_acceso_at: true,
      estado: true,
      organizacion: { select: { codigo: true, nombre_organizacion: true } },
    },
  });
  if (!u) redirect("/login");

  return (
    <AppShell current="">
      <div style={{ padding: "0 14px", color: theme.ink, maxWidth: 820 }}>
        <Card padding={28}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <Avatar name={u.nombre} color={avatarColorFor(u.nombre)} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em" }}>{u.nombre}</div>
              <div style={{ fontSize: 12.5, color: theme.inkMuted }}>{u.correo}</div>
            </div>
            <Badge tone="accent">{u.rol}</Badge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Función" v={u.funcion} />
            <Field label="Área"     v={u.area} />
            <Field label="Estado"   v={u.estado} />
            <Field label="MFA"      v={u.mfa_activo ? "Activo" : "No activado"} />
            <Field label="Último acceso" v={u.ultimo_acceso_at ? new Date(u.ultimo_acceso_at).toLocaleString("es-PE") : "—"} />
            <Field label="Organización"  v={`${u.organizacion.nombre_organizacion} (${u.organizacion.codigo})`} />
          </div>

          {/* HU05 — vinculación cuenta Microsoft */}
          <div style={{ marginTop: 24, padding: 20, borderRadius: theme.r.lg, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Cuenta Microsoft (HU05)
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                {u.azure_oid ? (
                  <>
                    <div style={{ fontSize: 13, color: theme.ink, fontWeight: 500 }}>Cuenta vinculada</div>
                    <div style={{ fontSize: 11.5, color: theme.inkMuted, marginTop: 4, fontFamily: "ui-monospace,monospace", wordBreak: "break-all" }}>
                      OID: {u.azure_oid}
                    </div>
                    <div style={{ fontSize: 11, color: theme.inkSoft, marginTop: 6 }}>
                      Ahora puedes iniciar sesión con &quot;Continuar con Microsoft&quot; usando este correo.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: theme.ink, fontWeight: 500 }}>Cuenta no vinculada</div>
                    <div style={{ fontSize: 11.5, color: theme.inkMuted, marginTop: 4 }}>
                      Vincula tu cuenta Microsoft para unificar la autenticación corporativa con Azure Entra ID.
                    </div>
                  </>
                )}
              </div>
              <MicrosoftLinkButtons linked={Boolean(u.azure_oid)} />
            </div>
          </div>
        </Card>

        <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 18, textAlign: "center" }}>
          Sprint 1 · HU05 · azure_oid usuario.id={u.id}
        </p>
      </div>
    </AppShell>
  );
}

function Field({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: theme.ink }}>{v || "—"}</div>
    </div>
  );
}
