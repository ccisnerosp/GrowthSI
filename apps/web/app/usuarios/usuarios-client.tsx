"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Field, Select, Icon, theme } from "@/lib/ui";
import { ROLES } from "@/lib/rbac";

const AREAS = ["Seguridad", "TI", "Auditoría", "Operaciones", "Finanzas", "RR.HH.", "Legal", "Gerencia", "Calidad", "Comercial"];

type Errors = Partial<Record<"nombre" | "correo" | "password" | "funcion" | "rol" | "area" | "_global", string>>;

export function UsuariosClient({ canCreate, sessionRol }: { canCreate: boolean; sessionRol: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: "", correo: "", password: "", funcion: "", rol: "", area: "" });
  const [errors, setErrors] = useState<Errors>({});

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, _global: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          correo: form.correo.trim(),
          password: form.password,
          funcion: form.funcion.trim(),
          rol: form.rol,
          area: form.area,
          mfa_activo: false,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: Array<{ path: string; message: string }> };
        const map: Errors = {};
        if (body.issues) for (const i of body.issues) map[i.path as keyof Errors] = i.message;
        map._global = body.error ?? "Error";
        setErrors(map);
        return;
      }
      setForm({ nombre: "", correo: "", password: "", funcion: "", rol: "", area: "" });
      setOpen(false);
      router.refresh();
    } catch {
      setErrors({ _global: "No se pudo conectar al servidor" });
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <div style={{ fontSize: 11.5, color: theme.inkMuted, padding: "6px 12px", borderRadius: theme.r.md, background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}` }}>
        Tu rol <strong style={{ color: theme.inkSoft }}>{sessionRol}</strong> no puede crear usuarios.
      </div>
    );
  }

  return (
    <>
      <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => setOpen(true)}>
        Registrar usuario
      </Button>

      {open && (
        <div
          onClick={() => !loading && setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(20,12,30,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560 }}>
            <Card padding={24}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, letterSpacing: "-0.01em" }}>Registrar usuario</div>
                  <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4 }}>Complete los datos del nuevo usuario.</div>
                </div>
                <button onClick={() => !loading && setOpen(false)} style={{ background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <Field label="Nombre completo" required value={form.nombre} onChange={set("nombre")} error={errors.nombre} placeholder="Andrea Vargas" />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <Field label="Correo corporativo" type="email" required value={form.correo} onChange={set("correo")} error={errors.correo} placeholder="usuario@empresa.com" />
                  </div>
                  <Field label="Función" required value={form.funcion} onChange={set("funcion")} error={errors.funcion} placeholder="Analista de SI" />
                  <Select label="Área" required value={form.area} onChange={set("area")} options={AREAS} />
                  <Select label="Rol" required value={form.rol} onChange={set("rol")} options={[...ROLES]} />
                  <Field label="Contraseña temporal" type="password" required value={form.password} onChange={set("password")} error={errors.password} hint="Mínimo 8 caracteres" />
                </div>

                {errors._global && (
                  <div style={{ marginTop: 14, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>
                    {errors._global}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
                  <Button type="submit" variant="primary" disabled={loading} icon={<Icon name="check" size={13} />}>
                    {loading ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
