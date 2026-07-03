// Sanitización de HTML de documentos (server-side). Cualquier HTML que venga del
// editor o de la IA pasa por aquí antes de persistir y al renderizar (defensa en
// profundidad). Allowlist estricta: sin <script>, sin handlers on*, sin
// javascript:/data: en enlaces; imágenes solo http(s) o ruta relativa (/uploads).

import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "span",
    "h1", "h2", "h3",
    "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote",
    "a", "img",
    "table", "thead", "tbody", "tr", "td", "th", "colgroup", "col",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    td: ["colspan", "rowspan", "colwidth", "style"],
    th: ["colspan", "rowspan", "colwidth", "style"],
    col: ["style", "span"],
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
  },
  // Solo esquemas seguros. img permite http/https, ruta relativa y data: (las
  // imágenes embebidas de un Word importado vienen como data:image; una imagen
  // por data: no ejecuta scripts, así que es seguro mostrarla).
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  // CSS inline mínimo y validado (ancho de columnas/alineación de tablas Tiptap).
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      "width": [/^\d{1,4}(px|%)?$/],
      "min-width": [/^\d{1,4}(px|%)?$/],
    },
  },
  transformTags: {
    // Enlaces externos: forzar rel seguro y abrir en pestaña nueva.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          rel: "noopener noreferrer nofollow",
          ...(external ? { target: "_blank" } : {}),
        },
      };
    },
  },
};

/** Limpia HTML de documento dejándolo seguro para almacenar/renderizar. */
export function sanitizeDocumentHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return sanitizeHtml(dirty, OPTIONS);
}
