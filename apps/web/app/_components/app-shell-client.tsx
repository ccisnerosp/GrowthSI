"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";
import { AuroraBg, Card, Logo, Badge, Avatar, Icon, theme } from "@/lib/ui";
import { avatarColorFor } from "@/lib/avatar-color";

// Colapsa el sidebar a un drawer por debajo de este ancho.
const NARROW_BP = 860;

export type NavItem = {
  id: string;
  href: string;
  label: string;
  module: string;
  icon: "dashboard" | "layers" | "target" | "doc" | "alert" | "shield" | "clipboard" | "flag" | "users";
  available: boolean;
};

export type SessionInfo = {
  nombre: string;
  correo: string;
  rol: string;
};

export type TenantInfo = {
  organizacion_id: number;
  codigo: string;
  nombre: string;
  sector: string;
  ruc: string;
  colaboradores: number;
  tenant_id: number;
  plan: string;
};

type Props = {
  nav: NavItem[];
  current: string;
  session: SessionInfo;
  tenant: TenantInfo;
  children: ReactNode;
};

export function AppShellClient({ nav, current, session, tenant, children }: Props) {
  const router = useRouter();
  const [narrow, setNarrow] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Detecta ancho angosto y colapsa el sidebar a drawer. SSR-safe (arranca en false).
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BP}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => { if (!narrow) setDrawerOpen(false); }, [narrow]);

  const sidebar = (
          <Card padding={14} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "4px 6px 18px" }}>
              <Logo size={28} />
            </div>

            {/* Tenant card (HU03 — indicador de aislamiento) */}
            <div style={{ padding: 12, marginBottom: 14, borderRadius: theme.r.md, background: theme.accentSoft, border: `1px solid ${theme.borderStrong}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: theme.accentDeep, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Empresa</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink, letterSpacing: "-0.01em" }}>{tenant.nombre}</div>
              <div style={{ fontSize: 11, color: theme.inkMuted, marginTop: 2 }}>{tenant.sector} · {tenant.colaboradores} colab.</div>
              <div style={{ fontSize: 10, color: theme.inkMuted, marginTop: 6, fontFamily: "ui-monospace,monospace" }}>
                {tenant.codigo} · tenant_id {tenant.tenant_id}
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 8px 8px" }}>Módulos</div>

            <nav className="scroll-slim" style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              {nav.map((item) => {
                const active = current === item.id;
                const disabled = !item.available;
                return (
                  <a
                    key={item.id}
                    href={disabled ? undefined : item.href}
                    aria-disabled={disabled}
                    onClick={() => setDrawerOpen(false)}
                    title={disabled ? "Disponible en próximos sprints" : item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      height: 38,
                      padding: "0 12px",
                      borderRadius: theme.r.md,
                      background: active ? theme.surfaceSolid : "transparent",
                      color: active ? theme.ink : disabled ? theme.inkMuted : theme.inkSoft,
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      cursor: disabled ? "not-allowed" : "pointer",
                      textDecoration: "none",
                      letterSpacing: "-0.005em",
                      position: "relative",
                      transition: "background .15s",
                      opacity: disabled ? 0.55 : 1,
                    }}
                  >
                    <Icon name={item.icon} size={17} color={active ? theme.accent : "currentColor"} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span style={{ fontSize: 9.5, color: theme.inkMuted, fontFamily: "ui-monospace,monospace" }}>{item.module}</span>
                    {disabled && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 999, background: "rgba(255,255,255,0.06)", color: theme.inkMuted }}>próximamente</span>}
                  </a>
                );
              })}
            </nav>

            {/* User block + logout (fijo al pie; el nav de arriba hace scroll) */}
            <div style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`, marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Avatar name={session.nombre} color={avatarColorFor(session.nombre)} size={32} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.nombre}</div>
                  <div style={{ fontSize: 10.5, color: theme.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.correo}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge tone="accent">{session.rol}</Badge>
                <a href="/perfil" style={{ fontSize: 11, color: theme.inkSoft, textDecoration: "none", marginLeft: "auto" }}>Mi perfil →</a>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{ marginTop: 8, width: "100%", height: 28, borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.inkSoft, fontSize: 11, fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Icon name="x" size={11} /> Cerrar sesión
              </button>
            </div>
          </Card>
  );

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", color: theme.ink }}>
      <AuroraBg />
      <div style={{ position: "relative", zIndex: 1, display: "flex", height: "100%" }}>
        {/* Sidebar fijo (escritorio) */}
        {!narrow && (
          <aside style={{ width: 256, flexShrink: 0, padding: 14, display: "flex", flexDirection: "column" }}>
            {sidebar}
          </aside>
        )}

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Barra superior con hamburguesa (solo en angosto) */}
          {narrow && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
              <button onClick={() => setDrawerOpen(true)} aria-label="Abrir menú"
                style={{ width: 38, height: 38, borderRadius: theme.r.md, border: `1px solid ${theme.borderStrong}`, background: theme.surfaceSolid, color: theme.ink, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="menu" size={18} />
              </button>
              <Logo size={24} />
            </div>
          )}
          <div style={{ flex: 1, overflow: "auto", padding: narrow ? "0 12px 12px" : "14px 14px 14px 0" }}>
            {children}
          </div>
        </div>
      </div>

      {/* Drawer (angosto): overlay + sidebar deslizante */}
      {narrow && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(12,8,20,0.6)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 280, maxWidth: "85%", padding: 14, display: "flex", flexDirection: "column" }}>
            {sidebar}
          </div>
        </div>
      )}

      <noscript />
      <button hidden onClick={() => router.refresh()} />
    </div>
  );
}
