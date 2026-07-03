"use client";

// Editor de documentos basado en Tiptap (ProseMirror). Ligero y con superficie
// acotada: encabezados, negrita/itálica/subrayado, listas, cita, enlace, tabla e
// imagen (subida a /api/uploads → URL, nunca base64). Mantiene la interfaz previa
// (initialHtml / onChange(html) / disabled) para no tocar a quien lo consume.

import { useRef, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { theme, Icon } from "@/lib/ui";
import { DocContentStyles } from "./doc-styles";

export default function TiptapEditor({ initialHtml, onChange, disabled }: {
  initialHtml: string; onChange: (html: string) => void; disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    editable: !disabled,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow" } }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
    ],
    content: initialHtml || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "tiptap-doc", style: "min-height: 360px; padding: 14px 16px;" } },
  });

  if (!editor) {
    return <div style={{ minHeight: 400, border: `1px solid ${theme.border}`, borderRadius: theme.r.md, color: theme.inkMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>Cargando editor…</div>;
  }

  const pickImage = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-subir el mismo archivo
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) { alert(body.error ?? "No se pudo subir la imagen"); return; }
      editor.chain().focus().setImage({ src: body.url, alt: file.name }).run();
    } catch { alert("No se pudo conectar para subir la imagen"); }
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace (vacío para quitar):", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: theme.r.md, background: "rgba(0,0,0,0.20)", overflow: "hidden" }}>
      <DocContentStyles />
      {!disabled && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 8, borderBottom: `1px solid ${theme.border}`, background: "rgba(255,255,255,0.02)" }}>
          <Tb editor={editor} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="H2" />
          <Tb editor={editor} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="H3" />
          <Sep />
          <Tb editor={editor} on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label={<strong>B</strong>} />
          <Tb editor={editor} on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label={<em>I</em>} />
          <Tb editor={editor} on={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} label={<span style={{ textDecoration: "underline" }}>U</span>} />
          <Sep />
          <Tb editor={editor} on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="• Lista" />
          <Tb editor={editor} on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="1. Lista" />
          <Tb editor={editor} on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="❝ Cita" />
          <Sep />
          <Tb editor={editor} on={setLink} active={editor.isActive("link")} label={<Icon name="link" size={13} />} />
          <Tb editor={editor} on={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={false} label={<Icon name="grid" size={13} />} />
          <Tb editor={editor} on={pickImage} active={false} label={<Icon name="upload" size={13} />} />
          {editor.isActive("table") && (
            <>
              <Sep />
              <Tb editor={editor} on={() => editor.chain().focus().addColumnAfter().run()} active={false} label="+Col" />
              <Tb editor={editor} on={() => editor.chain().focus().addRowAfter().run()} active={false} label="+Fila" />
              <Tb editor={editor} on={() => editor.chain().focus().deleteTable().run()} active={false} label="✕Tabla" />
            </>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} style={{ display: "none" }} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function Sep() {
  return <span style={{ width: 1, alignSelf: "stretch", background: theme.border, margin: "2px 2px" }} />;
}

function Tb({ on, active, label }: { editor: Editor; on: () => void; active: boolean; label: ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); on(); }} style={{
      height: 28, minWidth: 28, padding: "0 8px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
      border: `1px solid ${active ? theme.accent : "transparent"}`,
      background: active ? theme.accent : "transparent",
      color: active ? "#fff" : theme.inkSoft,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>{label}</button>
  );
}
