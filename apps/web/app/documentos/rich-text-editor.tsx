"use client";

// HU21 — Editor in-app basado en Tiptap (ProseMirror).
// Tiptap toca el DOM → se carga con next/dynamic (ssr:false). Mantiene la MISMA
// interfaz (initialHtml, onChange, disabled) para no tocar a sus consumidores.

import dynamic from "next/dynamic";
import { theme } from "@/lib/ui";

const TiptapEditor = dynamic(() => import("./tiptap-editor"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: 400, border: `1px solid ${theme.border}`, borderRadius: theme.r.md, display: "flex", alignItems: "center", justifyContent: "center", color: theme.inkMuted, fontSize: 13 }}>
      Cargando editor…
    </div>
  ),
});

export function RichTextEditor(props: {
  initialHtml: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  return <TiptapEditor {...props} />;
}
