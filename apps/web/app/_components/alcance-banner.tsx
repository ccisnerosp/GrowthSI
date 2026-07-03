"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, theme } from "@/lib/ui";
import type { ModuloAlcance } from "@/lib/alcance-revision";

// Banner de revisión pendiente tras un cambio del alcance del SGSI (cláusula 4.3).
// Aparece en Documentos / Riesgos / SoA cuando el alcance cambió y el módulo aún
// no se ha confirmado como revisado. El botón registra la revisión (quién + cuándo).
export function AlcanceBanner({
  modulo, modificadoAt, canReview, nota,
}: {
  modulo: ModuloAlcance;
  modificadoAt: string;
  canReview: boolean;
  nota: string; // qué revisar en este módulo
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const marcarRevisado = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/alcance/revision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulo }),
      });
      if (!res.ok) { setErr((await res.json().catch(() => ({})) as { error?: string }).error ?? "No se pudo registrar"); return; }
      router.refresh();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: "0 14px", marginBottom: 12 }}>
      <div style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(251,191,36,0.08)", border: `1px solid ${theme.warn}40` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.warn, fontSize: 12.5, fontWeight: 600 }}>
            <Icon name="alert" size={14} />
            El alcance del SGSI cambió el {modificadoAt} — revisa este módulo
          </div>
          {canReview && (
            <Button variant="soft" size="sm" icon={<Icon name="check" size={12} />} onClick={marcarRevisado} disabled={saving}>
              {saving ? "Guardando…" : "Marcar como revisado"}
            </Button>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 8 }}>{nota}</div>
        {err && <div style={{ fontSize: 11, color: theme.danger, marginTop: 6 }}>{err}</div>}
      </div>
    </div>
  );
}
