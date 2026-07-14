import { Fragment, type ReactNode } from "react";

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

export function splitTextParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\n+/)
    .map((paragraph) => paragraph.replace(/\s+$/, ""))
    .filter((paragraph) => paragraph.trim().length > 0);
}
