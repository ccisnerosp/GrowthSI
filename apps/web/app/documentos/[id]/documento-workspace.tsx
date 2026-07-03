"use client";

// M2 — Página dedicada del documento (reemplaza el drawer lateral).
// Render + edición (Tiptap), generación con IA, aprobación (triple-capa),
// historial y exportación. Sigue el sistema de diseño de la app.

import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Field, theme } from "@/lib/ui";
import { RichTextEditor } from "../rich-text-editor";
import { DocumentoRender } from "../doc-render";
import { estadoLabel, estadoTone } from "../documentos-client";
import { exportToWord, exportToPdf } from "@/lib/export-doc";

type Doc = {
  id: number; codigo: string; nombre: string; tipo: string; version: string;
  estado: string; obligatorio: boolean; descripcion: string; contenido: string;
  archivo_nombre: string | null; tiene_adjunto: boolean;
};
type Aprobacion = {
  id: number; codigo: string; tipo_entidad: string; entidad_id: number;
  comentario: string; estado: string;
  fecha_solicitud: string; fecha_respuesta: string | null; fecha_vencimiento: string;
};
type Perms = { update: boolean; delete: boolean; aprobacion_create: boolean; aprobacion_approve: boolean };

export function DocumentoWorkspace({ sessionRol, sessionNombre, perms, doc, aprobacionesInicial }: {
  sessionRol: string; sessionNombre: string; perms: Perms; doc: Doc; aprobacionesInicial: Aprobacion[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"contenido" | "aprobacion" | "historial">("contenido");
  const [contenido, setContenido] = useState(doc.contenido);
  const [editorKey, setEditorKey] = useState(0); // remonta el editor cuando el contenido se reemplaza
  const [meta, setMeta] = useState({ nombre: doc.nombre, version: doc.version });
  const [cambioResumen, setCambioResumen] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [adjunto, setAdjunto] = useState<{ tiene: boolean; nombre: string | null }>({ tiene: doc.tiene_adjunto, nombre: doc.archivo_nombre });
  const docxRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [responderOpen, setResponderOpen] = useState<null | { id: number; decision: "aprobado" | "rechazado" }>(null);

  // Aprobaciones y estado vienen del servidor (router.refresh los actualiza).
  const aprobaciones = aprobacionesInicial;
  const estado = doc.estado;
  const pendiente = aprobaciones.find((a) => a.estado === "pendiente");

  const generar = async () => {
    if (contenido.replace(/<[^>]*>/g, "").trim().length > 0 &&
        !confirm("Generar una plantilla reemplazará el contenido actual del editor. ¿Continuar?")) return;
    setGenerating(true); setMsg(null);
    try {
      const res = await fetch("/api/ia/plantilla-documento", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: doc.tipo, nombre: meta.nombre || doc.nombre }),
      });
      const body = (await res.json().catch(() => ({}))) as { contenido_html?: string; error?: string; iso_disponible?: boolean; alcance_pendiente?: boolean };
      if (!res.ok) { setMsg({ kind: "err", text: body.error ?? `Error ${res.status}` }); return; }
      if (body.contenido_html) {
        setContenido(body.contenido_html);
        setEditorKey((k) => k + 1);
        const base = body.iso_disponible ? "Plantilla generada con IA (RAG ISO), usando solo la información dentro del alcance. Revisa y guarda." : "Plantilla generada (ISO no ingestada aún), usando solo la información dentro del alcance. Revisa y guarda.";
        const aviso = body.alcance_pendiente ? " ⚠ El alcance del SGSI cambió y este módulo aún no se ha revisado: verifica que la plantilla refleje el alcance vigente." : "";
        setMsg({ kind: body.alcance_pendiente ? "info" : "info", text: base + aviso });
      }
    } catch { setMsg({ kind: "err", text: "No se pudo conectar al servicio IA" }); }
    finally { setGenerating(false); }
  };

  const importarWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (contenido.replace(/<[^>]*>/g, "").trim().length > 0 &&
        !confirm("Importar el Word REEMPLAZARÁ el contenido actual del documento (la versión anterior queda en el historial). ¿Continuar?")) return;
    setImporting(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/documentos/${doc.id}/adjunto`, { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { contenido?: string; archivo_nombre?: string; error?: string };
      if (!res.ok || body.contenido == null) { setMsg({ kind: "err", text: body.error ?? `Error ${res.status}` }); return; }
      setContenido(body.contenido);
      setEditorKey((k) => k + 1);
      setAdjunto({ tiene: true, nombre: body.archivo_nombre ?? file.name });
      setMsg({ kind: "ok", text: "Word importado y convertido. El contenido se reemplazó; el .docx original quedó adjunto. Revisa y guarda si ajustas algo." });
      router.refresh();
    } catch { setMsg({ kind: "err", text: "No se pudo conectar para importar el Word" }); }
    finally { setImporting(false); }
  };

  const guardar = async () => {
    if (!perms.update) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido, nombre: meta.nombre, version: meta.version, cambio_resumen: cambioResumen || undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setMsg({ kind: "err", text: body.error ?? "Error al guardar" }); return; }
      setMsg({ kind: "ok", text: "Documento guardado. Versión anterior archivada en el historial." });
      setCambioResumen("");
      router.refresh();
    } catch { setMsg({ kind: "err", text: "No se pudo conectar" }); }
    finally { setSaving(false); }
  };

  const exportar = (fmt: "word" | "pdf") => {
    const d = { codigo: doc.codigo, nombre: meta.nombre, tipo: doc.tipo, version: meta.version, estado, contenido };
    (fmt === "word" ? exportToWord : exportToPdf)(d);
  };

  return (
    <div style={{ padding: "0 14px", color: theme.ink }}>
      {/* Cabecera */}
      <button onClick={() => router.push("/documentos")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: theme.inkMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit", marginBottom: 10 }}>
        <Icon name="chevL" size={13} /> Documentos
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{meta.nombre}</div>
          <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "ui-monospace,monospace" }}>{doc.codigo}</span> · {doc.tipo} · v{meta.version}
            <Badge tone={estadoTone(estado)} dot>{estadoLabel(estado)}</Badge>
            {doc.obligatorio && <Badge tone="warn">Obligatorio</Badge>}
            {pendiente && <Badge tone="warn" dot>Aprobación pendiente</Badge>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: theme.inkMuted }}>Exportar:</span>
          <Button variant="ghost" size="sm" icon={<Icon name="doc" size={12} />} onClick={() => exportar("word")}>Word</Button>
          <Button variant="ghost" size="sm" icon={<Icon name="download" size={12} />} onClick={() => exportar("pdf")}>PDF</Button>
          {perms.update && tab === "contenido" && (
            <Button variant="primary" size="sm" disabled={saving} icon={<Icon name="check" size={13} />} onClick={guardar}>{saving ? "Guardando…" : "Guardar"}</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(0,0,0,0.30)", borderRadius: 12, marginBottom: 14, width: "fit-content" }}>
        {([
          { id: "contenido", label: "Contenido" },
          { id: "aprobacion", label: "Aprobación", count: aprobaciones.length || undefined },
          { id: "historial", label: "Historial" },
        ] as Array<{ id: typeof tab; label: string; count?: number }>).map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "none", background: active ? theme.surfaceSolid : "transparent", color: active ? theme.ink : theme.inkMuted, fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t.label}
              {t.count !== undefined && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: active ? theme.accentSoft : "rgba(255,255,255,0.08)", color: active ? theme.accentDeep : theme.inkMuted }}>{t.count}</span>}
            </button>
          );
        })}
      </div>

      <Card padding={20}>
        {tab === "contenido" ? (
          <>
            {perms.update && (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
                <Field label="Nombre" value={meta.nombre} onChange={(v) => setMeta({ ...meta, nombre: v })} />
                <Field label="Versión" value={meta.version} onChange={(v) => setMeta({ ...meta, version: v })} />
                <Button variant="ghost" size="sm" icon={<Icon name="upload" size={13} />} onClick={() => docxRef.current?.click()} disabled={importing} style={{ height: 40 }}>
                  {importing ? "Importando…" : "Importar Word"}
                </Button>
                <Button variant="ai" size="sm" icon={<Icon name="sparkle" size={13} />} onClick={generar} disabled={generating} style={{ height: 40 }}>
                  {generating ? "Generando…" : "Generar plantilla IA"}
                </Button>
                <input ref={docxRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={importarWord} style={{ display: "none" }} />
              </div>
            )}

            {adjunto.tiene && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 11.5, color: theme.inkSoft }}>
                <Icon name="doc" size={13} color={theme.accent} />
                Word adjunto: <strong style={{ color: theme.ink }}>{adjunto.nombre ?? "documento.docx"}</strong>
                <a href={`/api/documentos/${doc.id}/adjunto`} style={{ color: theme.accentDeep, textDecoration: "underline", marginLeft: 4 }}>Descargar .docx original</a>
              </div>
            )}

            {perms.update
              ? <RichTextEditor key={editorKey} initialHtml={contenido} onChange={setContenido} />
              : <DocumentoRender html={contenido} />}

            {perms.update && (
              <div style={{ marginTop: 12 }}>
                <Field label="Resumen del cambio (para el historial)" value={cambioResumen} onChange={setCambioResumen} placeholder="Ej. Se actualizó la sección de control de acceso" />
              </div>
            )}

            {msg && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, fontSize: 12,
                background: msg.kind === "ok" ? "rgba(52,211,153,0.10)" : msg.kind === "err" ? "rgba(248,113,113,0.10)" : "rgba(176,128,255,0.10)",
                border: `1px solid ${msg.kind === "ok" ? theme.success : msg.kind === "err" ? theme.danger : theme.accent}40`,
                color: msg.kind === "ok" ? theme.success : msg.kind === "err" ? theme.danger : theme.accentDeep }}>
                {msg.text}
              </div>
            )}
          </>
        ) : tab === "aprobacion" ? (
          <AprobacionPanel estado={estado} aprobaciones={aprobaciones} perms={perms} sessionRol={sessionRol}
            onSolicitar={() => setSolicitarOpen(true)} onResponder={(id, decision) => setResponderOpen({ id, decision })} />
        ) : (
          <HistorialPanel docId={doc.id} />
        )}
      </Card>

      {solicitarOpen && (
        <SolicitarModal docId={doc.id} onClose={() => setSolicitarOpen(false)} onSaved={() => { setSolicitarOpen(false); router.refresh(); }} />
      )}
      {responderOpen && (
        <ResponderModal aprobacionId={responderOpen.id} decision={responderOpen.decision} sessionNombre={sessionNombre} sessionRol={sessionRol}
          onClose={() => setResponderOpen(null)} onSaved={() => { setResponderOpen(null); router.refresh(); }} />
      )}
    </div>
  );
}

// ── Aprobación (triple-capa, igual que el flujo previo) ────────────────────
function AprobacionPanel({ estado, aprobaciones, perms, sessionRol, onSolicitar, onResponder }: {
  estado: string; aprobaciones: Aprobacion[]; perms: Perms; sessionRol: string;
  onSolicitar: () => void; onResponder: (id: number, decision: "aprobado" | "rechazado") => void;
}) {
  const pendiente = aprobaciones.find((a) => a.estado === "pendiente");
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.5 }}>
        El estado del documento lo gobierna este flujo: <strong style={{ color: theme.ink }}>borrador</strong> →
        {" "}<strong style={{ color: theme.ink }}>en revisión</strong> (solicitud enviada) →
        {" "}<strong style={{ color: theme.ink }}>aprobado</strong> (Gerencia lo aprueba) o de vuelta a borrador si se rechaza.
        Estado actual: <Badge tone={estadoTone(estado)} dot>{estadoLabel(estado)}</Badge>
        {" "}(tu rol: <strong style={{ color: theme.ink }}>{sessionRol}</strong>).
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Historial de aprobaciones</div>
        {aprobaciones.length === 0 ? (
          <div style={{ fontSize: 12, color: theme.inkMuted, fontStyle: "italic" }}>Sin solicitudes aún. {perms.aprobacion_create ? "Usa “Solicitar aprobación” para enviarla a Gerencia." : ""}</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {aprobaciones.map((a) => (
              <div key={a.id} style={{ padding: 10, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: theme.inkMuted }}>{a.codigo}</span>
                  <Badge tone={a.estado === "aprobado" ? "success" : a.estado === "rechazado" ? "danger" : "warn"} dot>{a.estado}</Badge>
                </div>
                <div style={{ fontSize: 12, color: theme.inkSoft, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{a.comentario}</div>
                <div style={{ fontSize: 10.5, color: theme.inkMuted, marginTop: 6 }}>
                  Solicitado {a.fecha_solicitud.slice(0, 10)}{a.fecha_respuesta && ` · respondido ${a.fecha_respuesta.slice(0, 10)}`} · vence {a.fecha_vencimiento}
                </div>
                {a.estado === "pendiente" && perms.aprobacion_approve && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <Button variant="primary" size="sm" icon={<Icon name="check" size={12} />} onClick={() => onResponder(a.id, "aprobado")}>Aprobar</Button>
                    <Button variant="danger" size="sm" icon={<Icon name="x" size={12} />} onClick={() => onResponder(a.id, "rechazado")}>Rechazar</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {!pendiente && perms.aprobacion_create && (
        <div>
          <Button variant="soft" size="sm" icon={<Icon name="send" size={12} />} onClick={onSolicitar}>Solicitar aprobación</Button>
          <span style={{ fontSize: 11, color: theme.inkMuted, marginLeft: 10 }}>Enviará el documento a Gerencia para su revisión.</span>
        </div>
      )}
    </div>
  );
}

function HistorialPanel({ docId }: { docId: number }) {
  const [items, setItems] = useState<Array<{ id: number; version: string; nombre: string; estado: string; cambio_resumen: string | null; usuario: { nombre: string } | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/documentos/${docId}/historial`)
      .then((r) => r.json())
      .then((b: { historial?: typeof items }) => { if (active) setItems(b.historial ?? []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [docId]);

  if (loading) return <div style={{ color: theme.inkMuted, fontSize: 13, padding: 20, textAlign: "center" }}>Cargando historial…</div>;
  if (items.length === 0) return <div style={{ color: theme.inkMuted, fontSize: 13, padding: 20, textAlign: "center", fontStyle: "italic" }}>Aún no hay cambios registrados. Cada vez que guardes, la versión anterior se archiva aquí.</div>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((h) => (
        <div key={h.id} style={{ padding: 12, borderRadius: theme.r.md, background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.ink }}>v{h.version} · {h.nombre}</span>
            <Badge tone={estadoTone(h.estado)} dot>{h.estado}</Badge>
          </div>
          {h.cambio_resumen && <div style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 4 }}>{h.cambio_resumen}</div>}
          <div style={{ fontSize: 10.5, color: theme.inkMuted }}>
            {h.usuario ? `Por ${h.usuario.nombre}` : "Por usuario desconocido"} · {new Date(h.created_at).toLocaleString("es-PE")}
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({ onClose, width = 520, children }: { onClose: () => void; width?: number; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(20,12,30,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: width }}>
        <Card padding={24}>{children}</Card>
      </div>
    </div>
  );
}

function SolicitarModal({ docId, onClose, onSaved }: { docId: number; onClose: () => void; onSaved: () => void }) {
  const [comentario, setComentario] = useState("");
  const [fechaVenc, setFechaVenc] = useState(() => new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (comentario.trim().length < 20) { setErr("Mínimo 20 caracteres en el sustento"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/aprobaciones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_entidad: "documento", entidad_id: docId, comentario, fecha_vencimiento: fechaVenc }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErr((b as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>Solicitar aprobación del documento</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 16 }}>El documento pasará a “en revisión” hasta que Gerencia lo apruebe o rechace.</div>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Sustento de la solicitud * (mínimo 20 caracteres)</span>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Resumen del documento, propósito, por qué está listo para aprobación…" style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 90 }} />
            <span style={{ fontSize: 10.5, color: comentario.trim().length >= 20 ? theme.success : theme.inkMuted, fontVariantNumeric: "tabular-nums" }}>{comentario.trim().length} caracteres</span>
          </label>
          <Field label="Fecha de vencimiento" type="date" value={fechaVenc} onChange={setFechaVenc} required />
        </div>
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving || comentario.trim().length < 20}>{saving ? "Enviando…" : "Enviar solicitud"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResponderModal({ aprobacionId, decision, sessionNombre, sessionRol, onClose, onSaved }: {
  aprobacionId: number; decision: "aprobado" | "rechazado"; sessionNombre: string; sessionRol: string; onClose: () => void; onSaved: () => void;
}) {
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isApprove = decision === "aprobado";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (comentario.trim().length < 20) { setErr("Mínimo 20 caracteres en el sustento"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/aprobaciones/${aprobacionId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comentario }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErr((b as { error?: string }).error ?? "Error"); return; }
      onSaved();
    } catch { setErr("No se pudo conectar"); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.ink, marginBottom: 4 }}>{isApprove ? "Aprobar documento" : "Rechazar documento"}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, marginBottom: 14 }}>Esta acción quedará registrada en el historial de aprobaciones con tu identidad.</div>
      <div style={{ padding: 12, borderRadius: theme.r.md, background: isApprove ? "rgba(52,211,153,0.10)" : "rgba(248,113,113,0.10)", border: `1px solid ${isApprove ? theme.success : theme.danger}40`, marginBottom: 14, fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.5 }}>
        Vas a {isApprove ? "aprobar" : "rechazar"} este documento como{" "}
        <strong style={{ color: theme.ink }}>{sessionNombre}</strong>{" "}
        <Badge tone="accent">{sessionRol}</Badge>. Si no eres tú, cierra esta sesión.
      </div>
      <form onSubmit={submit}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: theme.inkSoft }}>Sustento de la decisión * (mínimo 20 caracteres)</span>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder={isApprove ? "Conformidad con el contenido, alineación normativa…" : "Razones del rechazo, ajustes requeridos…"} style={{ padding: "10px 12px", borderRadius: theme.r.md, background: "rgba(0,0,0,0.25)", border: `1px solid ${theme.border}`, color: theme.ink, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 100 }} />
          <span style={{ fontSize: 10.5, color: comentario.trim().length >= 20 ? theme.success : theme.inkMuted, fontVariantNumeric: "tabular-nums" }}>{comentario.trim().length} caracteres</span>
        </label>
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: theme.r.md, background: "rgba(248,113,113,0.10)", border: `1px solid ${theme.danger}40`, color: theme.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant={isApprove ? "primary" : "danger"} disabled={saving || comentario.trim().length < 20}>
            {saving ? "Procesando…" : isApprove ? "Confirmar aprobación" : "Confirmar rechazo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
