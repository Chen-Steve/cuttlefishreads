/**
 * Lightweight Markdown footnotes:
 * - Inline: [^label: footnote text]  (definition lives in the marker)
 * - Classic: [^label] plus a [^label]: definition line
 */

export type Footnote = {
  /** Author-facing label (e.g. "1" or "note"). */
  label: string;
  /** HTML id–safe form of the label. */
  safeId: string;
  /** Inline-markdown body after the colon. */
  content: string;
  /** How many in-body references point at this footnote. */
  refCount: number;
};

export type PreparedFootnotes = {
  /** Body paragraphs with definition lines removed and inline notes normalized. */
  paragraphs: string[];
  /** Referenced footnotes in first-appearance order. */
  footnotes: Footnote[];
};

/** Definition line: [^id]: text */
const FOOTNOTE_DEF = /^\[\^([^\]\s:]+)\]:\s*(.*)$/;

/** Inline footnote: [^id: text] */
const FOOTNOTE_INLINE = /\[\^([^\]\s:]+):\s*([^\]]*)\]/g;

/** Reference that is not a definition line (`[^id]` not followed by `:`). */
const FOOTNOTE_REF = /\[\^([^\]\s:]+)\](?!:)/g;

export function sanitizeFootnoteId(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]/g, (ch) => {
    const code = ch.codePointAt(0);
    return code === undefined ? "" : `_${code.toString(16)}_`;
  });
}

/** Next unused numeric footnote label (`1`, `2`, …) in a Markdown string. */
export function nextFootnoteLabel(markdown: string): string {
  const used = new Set<string>();
  for (const match of markdown.matchAll(/\[\^([^\]\s:]+)/g)) {
    used.add(match[1]);
  }
  let n = 1;
  while (used.has(String(n))) n += 1;
  return String(n);
}

export function footnoteRefId(safeId: string, occurrence: number): string {
  return occurrence <= 1
    ? `cf-fnref-${safeId}`
    : `cf-fnref-${safeId}-${occurrence}`;
}

export function footnoteId(safeId: string): string {
  return `cf-fn-${safeId}`;
}

export type FootnotePart =
  | { type: "text"; value: string }
  | { type: "ref"; label: string };

/** Split a paragraph into plain text and footnote reference tokens. */
export function splitFootnoteParts(text: string): FootnotePart[] {
  const parts: FootnotePart[] = [];
  let lastIndex = 0;
  const re = new RegExp(FOOTNOTE_REF.source, "g");
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "ref", label: match[1] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

/**
 * Collect footnote definitions (inline + classic lines), normalize inline markers
 * to `[^label]`, and return footnotes that are actually referenced.
 * Duplicate definitions keep the first; undefined references stay literal.
 */
export function prepareChapterFootnotes(paragraphs: string[]): PreparedFootnotes {
  const definitions = new Map<string, string>();
  const body: string[] = [];

  for (const paragraph of paragraphs) {
    const match = FOOTNOTE_DEF.exec(paragraph);
    if (match) {
      const label = match[1];
      if (label && !definitions.has(label)) {
        definitions.set(label, match[2] ?? "");
      }
      continue;
    }
    body.push(paragraph);
  }

  // `[^1: note text]` → register definition and leave a plain `[^1]` marker.
  const normalized = body.map((paragraph) =>
    paragraph.replace(
      new RegExp(FOOTNOTE_INLINE.source, "g"),
      (_full, label: string, content: string) => {
        if (!definitions.has(label)) {
          definitions.set(label, content.replace(/\s+$/, ""));
        }
        return `[^${label}]`;
      },
    ),
  );

  if (definitions.size === 0) {
    return { paragraphs: normalized, footnotes: [] };
  }

  const order: string[] = [];
  const refCounts = new Map<string, number>();

  for (const paragraph of normalized) {
    const re = new RegExp(FOOTNOTE_REF.source, "g");
    for (const match of paragraph.matchAll(re)) {
      const label = match[1];
      if (!label || !definitions.has(label)) continue;
      refCounts.set(label, (refCounts.get(label) ?? 0) + 1);
      if (!order.includes(label)) order.push(label);
    }
  }

  const footnotes = order.map((label) => ({
    label,
    safeId: sanitizeFootnoteId(label),
    content: definitions.get(label) ?? "",
    refCount: refCounts.get(label) ?? 0,
  }));

  return { paragraphs: normalized, footnotes };
}
