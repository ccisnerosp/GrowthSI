"use client";

// Estilos del contenido del documento, compartidos por el editor (Tiptap) y el
// renderizado de solo lectura. Se inyectan una sola vez; ambos usan .tiptap-doc.

import { theme } from "@/lib/ui";

const CSS = `
.tiptap-doc { color: ${theme.ink}; font-size: 14px; line-height: 1.65; outline: none; word-break: break-word; }
.tiptap-doc:focus { outline: none; }
.tiptap-doc > :first-child { margin-top: 0; }
.tiptap-doc h2 { font-size: 18px; font-weight: 600; margin: 18px 0 8px; letter-spacing: -0.01em; }
.tiptap-doc h3 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; }
.tiptap-doc p { margin: 8px 0; }
.tiptap-doc ul, .tiptap-doc ol { margin: 8px 0 8px 22px; }
.tiptap-doc li { margin: 3px 0; }
.tiptap-doc blockquote { border-left: 3px solid ${theme.accent}; margin: 10px 0; padding: 2px 12px; color: ${theme.inkSoft}; }
.tiptap-doc a { color: ${theme.accentDeep}; text-decoration: underline; }
.tiptap-doc strong { font-weight: 600; }
.tiptap-doc hr { border: none; border-top: 1px solid ${theme.border}; margin: 16px 0; }
.tiptap-doc img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; border: 1px solid ${theme.border}; }
.tiptap-doc .tableWrapper { overflow-x: auto; margin: 12px 0; }
.tiptap-doc table { border-collapse: collapse; width: 100%; table-layout: fixed; }
.tiptap-doc td, .tiptap-doc th { border: 1px solid ${theme.border}; padding: 6px 10px; vertical-align: top; position: relative; }
.tiptap-doc th { background: rgba(255,255,255,0.04); font-weight: 600; text-align: left; }
.tiptap-doc .selectedCell:after { content: ""; position: absolute; inset: 0; background: ${theme.accent}22; pointer-events: none; }
.tiptap-doc .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: ${theme.accent}; cursor: col-resize; }
`;

export function DocContentStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
