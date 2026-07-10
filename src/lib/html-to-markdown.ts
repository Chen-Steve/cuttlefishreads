/**
 * Two-way conversion between the lightweight Markdown stored in the database
 * (**bold**, _italic_, ++underline++, blank-line paragraphs) and the HTML
 * shown inside the rich-text editor.
 *
 * Word often wraps whole paragraphs in <b style="font-weight:normal">, so
 * bold/italic/underline are tracked as inherited flags that styles can turn
 * on or off while walking the pasted DOM.
 */

import {
  INITIAL_INLINE_STYLE,
  parseInlineMarkdown,
  type InlineSegment,
  type InlineStyle,
} from "@/lib/inline-markdown";

type StyleFlag = boolean;

function normalizeWhitespace(text: string): string {
  return text.replace(/[\u00a0\u2007\u202f]/g, " ");
}

/** Resolve whether this element turns bold on, off, or leaves it unchanged. */
function resolveBold(el: HTMLElement, inherited: StyleFlag): StyleFlag {
  const tag = el.tagName.toLowerCase();
  const styleAttr = el.getAttribute("style")?.toLowerCase() ?? "";
  const weight = (el.style.fontWeight || "").toLowerCase();

  // Explicit normal wins — Word uses <b style="font-weight:normal"> wrappers.
  if (
    weight === "normal" ||
    weight === "400" ||
    /(?:^|;)\s*font-weight\s*:\s*(normal|400)\b/.test(styleAttr) ||
    /(?:^|;)\s*mso-bidi-font-weight\s*:\s*normal/.test(styleAttr)
  ) {
    return false;
  }

  if (tag === "b" || tag === "strong") return true;

  if (weight === "bold" || weight === "bolder") return true;
  const numeric = Number.parseInt(weight, 10);
  if (!Number.isNaN(numeric) && numeric >= 600) return true;

  if (
    /(?:^|;)\s*font-weight\s*:\s*(bold|bolder|[6-9]\d{2})/.test(styleAttr) ||
    /(?:^|;)\s*mso-bidi-font-weight\s*:\s*bold/.test(styleAttr)
  ) {
    return true;
  }

  return inherited;
}

/** Resolve whether this element turns italic on, off, or leaves it unchanged. */
function resolveItalic(el: HTMLElement, inherited: StyleFlag): StyleFlag {
  const tag = el.tagName.toLowerCase();
  const styleAttr = el.getAttribute("style")?.toLowerCase() ?? "";
  const style = (el.style.fontStyle || "").toLowerCase();

  if (
    style === "normal" ||
    /(?:^|;)\s*font-style\s*:\s*normal/.test(styleAttr) ||
    /(?:^|;)\s*mso-bidi-font-style\s*:\s*normal/.test(styleAttr)
  ) {
    return false;
  }

  if (tag === "i" || tag === "em") return true;

  if (style === "italic" || style === "oblique") return true;

  if (
    /(?:^|;)\s*font-style\s*:\s*(italic|oblique)/.test(styleAttr) ||
    /(?:^|;)\s*mso-bidi-font-style\s*:\s*italic/.test(styleAttr)
  ) {
    return true;
  }

  return inherited;
}

/** Resolve whether this element turns underline on, off, or leaves it unchanged. */
function resolveUnderline(el: HTMLElement, inherited: StyleFlag): StyleFlag {
  const tag = el.tagName.toLowerCase();
  const styleAttr = el.getAttribute("style")?.toLowerCase() ?? "";
  const decoration = (
    el.style.textDecoration ||
    el.style.textDecorationLine ||
    ""
  ).toLowerCase();

  if (
    /\bnone\b/.test(decoration) ||
    /(?:^|;)\s*text-decoration(?:-line)?\s*:\s*none/.test(styleAttr)
  ) {
    return false;
  }

  if (tag === "u" || tag === "ins") return true;

  if (/\bunderline\b/.test(decoration)) return true;

  if (/(?:^|;)\s*text-decoration(?:-line)?\s*:[^;]*\bunderline\b/.test(styleAttr)) {
    return true;
  }

  return inherited;
}

function wrapMarkdown(
  text: string,
  bold: boolean,
  italic: boolean,
  underline: boolean,
): string {
  if (!text) return "";
  // Preserve leading/trailing spaces outside markers so " **word** " stays readable.
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = text.slice(leading.length, text.length - trailing.length);
  if (!core) return text;

  let wrapped = core;
  if (bold) wrapped = `**${wrapped}**`;
  if (italic) wrapped = `_${wrapped}_`;
  if (underline) wrapped = `++${wrapped}++`;
  return `${leading}${wrapped}${trailing}`;
}

function walkNode(
  node: Node,
  bold: StyleFlag,
  italic: StyleFlag,
  underline: StyleFlag,
  out: string[],
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeWhitespace(node.textContent ?? "");
    if (!text) return;
    out.push(wrapMarkdown(text, bold, italic, underline));
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Skip Word/Office metadata and non-content.
  if (
    tag === "style" ||
    tag === "script" ||
    tag === "meta" ||
    tag === "link" ||
    tag === "title" ||
    tag === "xml" ||
    tag.startsWith("o:") ||
    tag.startsWith("w:") ||
    tag.startsWith("m:")
  ) {
    return;
  }

  if (tag === "br") {
    out.push("\n");
    return;
  }

  const nextBold = resolveBold(el, bold);
  const nextItalic = resolveItalic(el, italic);
  const nextUnderline = resolveUnderline(el, underline);
  const isBlock =
    tag === "p" ||
    tag === "div" ||
    tag === "li" ||
    tag === "h1" ||
    tag === "h2" ||
    tag === "h3" ||
    tag === "h4" ||
    tag === "h5" ||
    tag === "h6" ||
    tag === "tr" ||
    tag === "blockquote" ||
    tag === "section" ||
    tag === "article";

  if (isBlock && out.length > 0 && !out[out.length - 1]?.endsWith("\n")) {
    out.push("\n\n");
  }

  for (const child of Array.from(el.childNodes)) {
    walkNode(child, nextBold, nextItalic, nextUnderline, out);
  }

  if (isBlock) {
    out.push("\n\n");
  }
}

/** Collapse runs of blank lines and trim edges. */
function normalizeParagraphs(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Word uses <br> for manual/soft line breaks inside a paragraph. The editor's
 * storage format uses blank lines for real paragraph boundaries, so reflow
 * single line breaks while preserving blank-line paragraph breaks.
 */
function normalizePastedParagraphs(text: string): string {
  return normalizeParagraphs(text).replace(/(?<!\n)\n(?!\n)/g, " ");
}

/** Serialize a live DOM subtree (e.g. the editor) into Markdown. */
export function domToMarkdown(root: Element): string {
  const parts: string[] = [];
  for (const child of Array.from(root.childNodes)) {
    walkNode(child, false, false, false, parts);
  }
  return normalizeParagraphs(parts.join(""));
}

/**
 * Convert an HTML clipboard fragment into Markdown.
 * Returns null when the HTML has no useful content.
 */
export function htmlToMarkdown(html: string): string | null {
  const trimmed = html.trim();
  if (!trimmed) return null;

  if (typeof DOMParser === "undefined") return null;

  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  const root = doc.body;
  if (!root) return null;

  const markdown = normalizePastedParagraphs(domToMarkdown(root));
  return markdown.length > 0 ? markdown : null;
}

/**
 * Prefer HTML→Markdown when the clipboard has rich text; otherwise use plain text.
 */
export function clipboardToMarkdown(
  html: string | null | undefined,
  plain: string | null | undefined,
): string {
  if (html) {
    const converted = htmlToMarkdown(html);
    if (converted !== null) return converted;
  }
  return normalizePastedParagraphs(plain ?? "");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function segmentToHtml(segment: InlineSegment): string {
  let html = escapeHtml(segment.text);
  if (segment.style.underline) html = `<u>${html}</u>`;
  if (segment.style.italic) html = `<em>${html}</em>`;
  if (segment.style.bold) html = `<strong>${html}</strong>`;
  return html;
}

/**
 * Convert stored Markdown into the HTML shown inside the rich-text editor.
 * Style state carries across paragraphs so markers spanning paragraph breaks
 * format correctly; saving the editor then re-serializes them per paragraph.
 */
export function markdownToEditorHtml(markdown: string): string {
  const normalized = normalizeParagraphs(markdown);
  if (!normalized) return "";
  let state: InlineStyle = INITIAL_INLINE_STYLE;
  return normalized
    .split(/\n+/)
    .map((paragraph) => {
      const parsed = parseInlineMarkdown(paragraph, state);
      state = parsed.state;
      return `<p>${parsed.segments.map(segmentToHtml).join("")}</p>`;
    })
    .join("");
}
