import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, Badge, Avatar } from "@/lib/ui";
import { theme } from "@/lib/theme";
import { avatarColorFor } from "@/lib/avatar-color";
import { AppShell } from "@/app/_components/app-shell";
import { UsuariosClient } from "./usuarios-client";

// HU04 — Lista de usuarios. Lectura: Administrador, CISO. Creación: solo Administrador.

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.rol, "usuario", "read")) {
    redirect("/dashboard?forbidden=usuario:read");
  }

  const usuarios = await prisma.usuario.findMany({
    where: { organizacion_id: session.user.organizacion_id }, // HU03 — scoping
    select: {
      id: true, nombre: true, correo: true, funcion: true, rol: true, area: true,
      mfa_activo: true, azure_oid: true, ultimo_acceso_at: true, estado: true,
    },
    orderBy: { id: "asc" },
  });

  const canCreate = can(session.user.rol, "usuario", "create");

  const eTone: Record<string, "success" | "info" | "danger" | "neutral"> = {
    activo: "success", invitado: "info", suspendido: "danger", inactivo: "neutral",
  };

  return (
    <AppShell current="usuarios">
      <div style={{ padding: "0 14px", color: theme.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 600, color: theme.ink, letterSpacing: "-0.02em" }}>Usuarios y roles</div>
            <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>
              M6 · RBAC — {usuarios.length} usuarios en el tenant
            </div>
          </div>
          <UsuariosClient canCreate={canCreate} sessionRol={session.user.rol} />
        </div>

        <Card padding={0}>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["Usuario", "Función", "Rol", "Área", "MFA", "Microsoft", "Estado"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 10.5, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={u.nombre} color={avatarColorFor(u.nombre)} size={32} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink, letterSpacing: "-0.005em" }}>{u.nombre}</div>
                          <div style={{ fontSize: 11, color: theme.inkMuted }}>{u.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: theme.inkSoft, fontSize: 12 }}>{u.funcion}</td>
                    <td style={{ padding: "12px 14px" }}><Badge tone="accent">{u.rol}</Badge></td>
                    <td style={{ padding: "12px 14px", color: theme.inkSoft }}>{u.area}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {u.mfa_activo ? <Badge tone="success" dot>Activo</Badge> : <Badge tone="warn" dot>Pendiente</Badge>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {u.azure_oid ? <Badge tone="info" dot>Vinculado</Badge> : <Badge tone="neutral">Sin vincular</Badge>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge tone={eTone[u.estado] ?? "neutral"} dot>{u.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p style={{ fontSize: 11, color: theme.inkMuted, marginTop: 18, textAlign: "center" }}>
          Tu rol: <strong style={{ color: theme.ink }}>{session.user.rol}</strong> · Creación de usuarios: {canCreate ? "permitida" : "denegada"}
        </p>
      </div>
    </AppShell>
  );
}
