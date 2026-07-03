// Exportación de documentos del SGSI a Word (.doc) y PDF — client-side, sin deps.
//
// El contenido es HTML (de CKEditor). Para Word usamos el truco HTML+MSO
// (Word abre el .doc y permite seguir editando). Para PDF abrimos una
// ventana con CSS de impresión y disparamos print() → el usuario guarda como
// PDF (texto vectorial, calidad real, no rasterizado).

export type ExportableDoc = {
  codigo: string;
  nombre: string;
  tipo: string;
  version: string;
  estado: string;
  contenido: string; // HTML
};

const PAGE_CSS = `
  @page { size: A4; margin: 2.2cm 2.4cm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; font-size: 12pt; }
  .doc-header { border-bottom: 2px solid #2a251f; padding-bottom: 14px; margin-bottom: 26px; }
  .doc-header .org { font-family: Arial, sans-serif; font-size: 8.5pt; letter-spacing: .12em; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .doc-header h1 { font-size: 17pt; font-weight: 700; margin: 0 0 10px; line-height: 1.25; }
  .doc-meta { font-family: Arial, sans-serif; font-size: 9pt; color: #555; display: flex; gap: 22px; flex-wrap: wrap; }
  .doc-meta strong { color: #1a1a1a; }
  .doc-body h2 { font-size: 14pt; margin: 22px 0 8px; }
  .doc-body h3 { font-size: 12.5pt; margin: 16px 0 6px; }
  .doc-body p { margin: 8px 0; text-align: justify; }
  .doc-body ul, .doc-body ol { margin: 8px 0 8px 22px; }
  .doc-body table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  .doc-body td, .doc-body th { border: 1px solid #bbb; padding: 6px 8px; font-size: 11pt; }
`;

function buildHtml(doc: ExportableDoc, forWord: boolean): string {
  const hoy = new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" });
  const header = `
    <div class="doc-header">
      <div class="org">LogiNorte · Sistema de Gestión de Seguridad de la Información</div>
      <h1>${escapeHtml(doc.nombre)}</h1>
      <div class="doc-meta">
        <span><strong>Código:</strong> ${escapeHtml(doc.codigo)}</span>
        <span><strong>Tipo:</strong> ${escapeHtml(doc.tipo)}</span>
        <span><strong>Versión:</strong> ${escapeHtml(doc.version)}</span>
        <span><strong>Estado:</strong> ${escapeHtml(doc.estado)}</span>
        <span><strong>Exportado:</strong> ${hoy}</span>
      </div>
    </div>
    <div class="doc-body">${doc.contenido || "<p><em>(Documento sin contenido)</em></p>"}</div>`;

  if (forWord) {
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${escapeHtml(doc.nombre)}</title><style>${PAGE_CSS}</style></head>
      <body>${header}</body></html>`;
  }
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(doc.nombre)}</title><style>${PAGE_CSS}</style></head><body>${header}</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Descarga el documento como .doc (HTML+MSO; Word lo abre y permite editar). */
export function exportToWord(doc: ExportableDoc): void {
  const html = buildHtml(doc, true);
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.codigo}_${slug(doc.nombre)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Abre ventana con CSS de impresión y dispara print() → guardar como PDF. */
export function exportToPdf(doc: ExportableDoc): void {
  const html = buildHtml(doc, false);
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Permite las ventanas emergentes para exportar a PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Esperar a que rendericen estilos antes de imprimir
  w.onload = () => {
    w.focus();
    w.print();
  };
  // Fallback si onload no dispara (algunos navegadores)
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 600);
}

function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
}
