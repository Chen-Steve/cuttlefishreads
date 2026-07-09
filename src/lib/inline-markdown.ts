/**
 * Stateful parser for the lightweight inline Markdown stored in the database
 * (**bold**, _italic_, ++underline++).
 *
 * Style state can be threaded across paragraphs: a marker opens a style and it
 * stays active — even across paragraph breaks — until the closing marker shows
 * up. Pasted content often ends up with markers that span paragraphs, and a
 * per-paragraph pair matcher would leave those markers visible as literal
 * `**` / `_` (or italicize the wrong span when a closing and an opening
 * underscore pair up with each other).
 */

export type InlineStyle = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

export type InlineSegment = { text: string; style: InlineStyle };

export const INITIAL_INLINE_STYLE: InlineStyle = {
  bold: false,
  italic: false,
  underline: false,
};

const WORD_CHAR = /[\p{L}\p{N}]/u;

function isWhitespace(ch: string | undefined): boolean {
  return ch !== undefined && /\s/.test(ch);
}

export function parseInlineMarkdown(
  text: string,
  state: InlineStyle = INITIAL_INLINE_STYLE,
): { segments: InlineSegment[]; state: InlineStyle } {
  const segments: InlineSegment[] = [];
  const current: InlineStyle = { ...state };
  let buffer = "";

  const flush = () => {
    if (buffer) {
      segments.push({ text: buffer, style: { ...current } });
      buffer = "";
    }
  };

  let i = 0;
  while (i < text.length) {
    const pair = text.slice(i, i + 2);

    if (pair === "**" || pair === "++") {
      const key = pair === "**" ? "bold" : "underline";
      const prev = text[i - 1];
      const next = text[i + 2];
      // Opening markers must touch the text they format; closing markers must
      // not float after whitespace. Anything else is literal text.
      const toggles = current[key]
        ? !isWhitespace(prev)
        : next !== undefined && !isWhitespace(next);
      if (toggles) {
        flush();
        current[key] = !current[key];
      } else {
        buffer += pair;
      }
      i += 2;
      continue;
    }

    const ch = text[i];
    if (ch === "_") {
      const prev = text[i - 1];
      const next = text[i + 1];
      // Extra guard for underscores: ignore ones inside words (snake_case).
      const toggles = current.italic
        ? !isWhitespace(prev) &&
          !(next !== undefined && WORD_CHAR.test(next) && prev !== undefined && WORD_CHAR.test(prev))
        : next !== undefined &&
          !isWhitespace(next) &&
          !(prev !== undefined && WORD_CHAR.test(prev));
      if (toggles) {
        flush();
        current.italic = !current.italic;
      } else {
        buffer += ch;
      }
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  flush();
  return { segments, state: current };
}
