"use client";

// Render de solo lectura del documento. Recibe HTML YA SANITIZADO (en el servidor)
// y lo muestra con los mismos estilos del editor. Para roles de solo lectura no se
// carga el editor → más ligero.

import { theme } from "@/lib/ui";
import { DocContentStyles } from "./doc-styles";

export function DocumentoRender({ html }: { html: string }) {
  const empty = !html || html.replace(/<[^>]*>/g, "").trim().length === 0;
  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: theme.r.md, background: "rgba(0,0,0,0.20)", padding: "14px 16px", minHeight: 360 }}>
      <DocContentStyles />
      {empty ? (
        <div style={{ color: theme.inkMuted, fontStyle: "italic", fontSize: 13 }}>Este documento aún no tiene contenido.</div>
      ) : (
        <div className="tiptap-doc" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
