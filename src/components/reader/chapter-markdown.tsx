import { Fragment, type ReactNode } from "react";

import {
  footnoteId,
  footnoteRefId,
  splitFootnoteParts,
  type Footnote,
} from "@/lib/footnotes";
import {
  INITIAL_INLINE_STYLE,
  parseInlineMarkdown,
  type InlineSegment,
  type InlineStyle,
} from "@/lib/inline-markdown";

function renderSegments(segments: InlineSegment[]): ReactNode[] {
  return segments.map((segment, index) => {
    let node: ReactNode = segment.text;
    if (segment.style.underline) node = <u>{node}</u>;
    if (segment.style.italic) node = <em>{node}</em>;
    if (segment.style.bold) node = <strong>{node}</strong>;
    return <Fragment key={index}>{node}</Fragment>;
  });
}

/**
 * Render a sequence of paragraphs, carrying bold/italic/underline state across
 * paragraph breaks so markers that open in one paragraph and close in a later
 * one still format correctly instead of showing up as literal `**` / `_`.
 */
export function renderMarkdownParagraphs(paragraphs: string[]): ReactNode[][] {
  let state: InlineStyle = INITIAL_INLINE_STYLE;
  return paragraphs.map((paragraph) => {
    const parsed = parseInlineMarkdown(paragraph, state);
    state = parsed.state;
    return renderSegments(parsed.segments);
  });
}

const footnoteLinkClassName =
  "footnote-link scroll-mt-4 rounded-sm text-current underline decoration-current/40 underline-offset-2 outline-none transition-colors hover:decoration-current focus-visible:ring-2 focus-visible:ring-current/40";

/**
 * Chapter body with footnote markers as superscript links. Inline
 * `[^label: text]` forms are normalized before this runs. Undefined refs stay
 * literal. Style state still threads across paragraphs and around markers.
 */
export function renderChapterParagraphs(
  paragraphs: string[],
  footnotes: Footnote[],
): ReactNode[][] {
  const defined = new Map(footnotes.map((fn) => [fn.label, fn]));
  const occurrence = new Map<string, number>();
  let state: InlineStyle = INITIAL_INLINE_STYLE;

  return paragraphs.map((paragraph, paragraphIndex) => {
    const parts = splitFootnoteParts(paragraph);
    const nodes: ReactNode[] = [];

    for (const [partIndex, part] of parts.entries()) {
      if (part.type === "text") {
        const parsed = parseInlineMarkdown(part.value, state);
        state = parsed.state;
        nodes.push(
          <Fragment key={`${paragraphIndex}-t-${partIndex}`}>
            {renderSegments(parsed.segments)}
          </Fragment>,
        );
        continue;
      }

      const footnote = defined.get(part.label);
      if (!footnote) {
        const literal = `[^${part.label}]`;
        nodes.push(
          <Fragment key={`${paragraphIndex}-u-${partIndex}`}>
            {renderSegments([{ text: literal, style: { ...state } }])}
          </Fragment>,
        );
        continue;
      }

      const next = (occurrence.get(part.label) ?? 0) + 1;
      occurrence.set(part.label, next);
      const refId = footnoteRefId(footnote.safeId, next);

      nodes.push(
        <sup
          key={`${paragraphIndex}-r-${partIndex}`}
          className="footnote-ref relative -top-0.5 ml-0.5 text-[0.7em] leading-none"
        >
          <a
            id={refId}
            href={`#${footnoteId(footnote.safeId)}`}
            className={footnoteLinkClassName}
            aria-describedby={footnoteId(footnote.safeId)}
          >
            {part.label}
          </a>
        </sup>,
      );
    }

    return nodes;
  });
}

export function renderFootnoteContent(content: string): ReactNode[] {
  const parsed = parseInlineMarkdown(content, INITIAL_INLINE_STYLE);
  return renderSegments(parsed.segments);
}

export function renderFootnoteBacklinks(footnote: Footnote): ReactNode {
  if (footnote.refCount <= 0) return null;

  return (
    <span className="ml-1.5 inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {Array.from({ length: footnote.refCount }, (_, index) => {
        const occurrence = index + 1;
        const href = `#${footnoteRefId(footnote.safeId, occurrence)}`;
        const label =
          footnote.refCount > 1
            ? `Back to reference ${occurrence}`
            : "Back to content";

        return (
          <a
            key={occurrence}
            href={href}
            className={footnoteLinkClassName}
            aria-label={label}
          >
            ↩{footnote.refCount > 1 ? <sup>{occurrence}</sup> : null}
          </a>
        );
      })}
    </span>
  );
}

export function splitTextParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\n+/)
    .map((paragraph) => paragraph.replace(/\s+$/, ""))
    .filter((paragraph) => paragraph.trim().length > 0);
}
