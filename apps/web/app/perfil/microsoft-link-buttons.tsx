"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon } from "@/lib/ui";

export function MicrosoftLinkButtons({ linked }: { linked: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (path: "vincular-microsoft" | "desvincular-microsoft") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/perfil/${path}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Error en la operación");
      } else {
        router.refresh();
      }
    } catch {
      setError("No se pudo conectar al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      {linked ? (
        <Button variant="danger" size="sm" disabled={loading} icon={<Icon name="x" size={12} />} onClick={() => handle("desvincular-microsoft")}>
          {loading ? "Desvinculando…" : "Desvincular"}
        </Button>
      ) : (
        <Button variant="primary" size="md" disabled={loading} icon={<Icon name="msft" size={14} />} onClick={() => handle("vincular-microsoft")}>
          {loading ? "Vinculando…" : "Vincular cuenta Microsoft"}
        </Button>
      )}
      {error && <span style={{ fontSize: 11, color: "#F87171" }}>{error}</span>}
    </div>
  );
}
