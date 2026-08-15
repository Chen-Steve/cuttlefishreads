/** Shared helpers for bulk chapter import. Browser parsing lives in chapter-import-browser. */

export const CHAPTER_IMPORT_EXTENSIONS = ["txt", "md", "docx", "pdf"] as const;
export type ChapterImportExtension = (typeof CHAPTER_IMPORT_EXTENSIONS)[number];

export const MAX_IMPORT_CHAPTERS = 200;
export const MAX_IMPORT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_IMPORT_TOTAL_BYTES = 80 * 1024 * 1024;

const SKIP_PATH_RE = /(^|\/)(\.|__macosx\/|thumbs\.db$|desktop\.ini$)/i;

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function isChapterImportFile(filename: string): boolean {
  const ext = extensionOf(filename);
  return (CHAPTER_IMPORT_EXTENSIONS as readonly string[]).includes(ext);
}

export function isZipFile(filename: string, mimeType = ""): boolean {
  if (extensionOf(filename) === "zip") return true;
  return (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed" ||
    (mimeType === "application/octet-stream" &&
      filename.toLowerCase().endsWith(".zip"))
  );
}

export function shouldSkipImportPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").trim();
  if (!normalized || normalized.endsWith("/")) return true;
  return SKIP_PATH_RE.test(normalized.toLowerCase());
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function fileStem(path: string): string {
  const base = (path.split(/[/\\]/).pop() ?? path).replace(/\.[^.]+$/, "");
  return base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Pull a chapter number and leftover title from a filename.
 * `Chapter 1.txt` → number 1, no title.
 * `Chapter 1: The Storm.txt` / `Chapter 1 - The Storm.txt` → title "The Storm".
 */
export function parseChapterFilename(path: string): {
  number: number | null;
  title: string;
} {
  const stem = fileStem(path);
  if (!stem) return { number: null, title: "" };

  const labeled =
    stem.match(/^第\s*0*(\d+)\s*章/u) ??
    stem.match(/^(?:chapter|ch\.?|ep\.?|episode)\s*0*(\d+)/iu) ??
    stem.match(/^0*(\d+)/);

  if (!labeled) return { number: null, title: cleanTitle(stem) };

  const number = Number(labeled[1]);
  const rest = stem.slice(labeled[0].length);
  const separator = rest.match(/^\s*[.:：\-–—‐−]+\s*/);
  if (!separator) return { number, title: "" };

  return { number, title: titleAfterNumber(rest.slice(separator[0].length)) };
}

function titleAfterNumber(raw: string): string {
  return cleanTitle(raw.replace(/^(?:chapter|ch\.?|ep\.?|episode)\s*$/iu, ""));
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^[\s._\-–—:：]+/, "")
    .replace(/[\s._\-–—:：]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Decode text files, honoring UTF-8 / UTF-16 BOMs. */
export function decodeTextBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * Turn a plain-text chapter into stored Markdown paragraphs.
 * Blank lines mark paragraphs (wrapped lines are joined). Files with no blank
 * lines keep each line as its own paragraph so novel-style exports stay spaced.
 */
export function textToChapterMarkdown(raw: string): string {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const trimmed = text.replace(/[ \t]+\n/g, "\n").trim();
  if (!trimmed) return "";

  if (/\n\s*\n/.test(trimmed)) {
    return trimmed
      .split(/\n[ \t]*\n+/)
      .map((paragraph) => paragraph.replace(/\n+/g, " ").replace(/[ \t]+/g, " ").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  return trimmed
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Keep Markdown files as authored, with normalized paragraph breaks. */
export function markdownFileToChapterMarkdown(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type NumberedImport = {
  path: string;
  title: string;
  content: string;
  number: number;
  warning?: string;
};

export function assignChapterNumbers(
  files: Array<{ path: string; content: string }>,
  nextNumber: number,
  existingNumbers: Iterable<number>,
): NumberedImport[] {
  const existing = new Set(existingNumbers);
  const taken = new Set(existing);
  let cursor = Math.max(1, nextNumber);

  const nextFree = () => {
    while (taken.has(cursor)) cursor += 1;
    const value = cursor;
    taken.add(value);
    cursor += 1;
    return value;
  };

  const sorted = [...files].sort((a, b) => naturalCompare(a.path, b.path));
  return sorted.map((file) => {
    const parsed = parseChapterFilename(file.path);
    let warning: string | undefined;
    let number = parsed.number;

    if (number != null && number >= 1) {
      if (taken.has(number)) {
        warning = existing.has(number)
          ? `This novel already has chapter ${number}. Change the number before uploading.`
          : `Another file in this upload is also chapter ${number}. Change one of them.`;
      } else {
        taken.add(number);
        if (number >= cursor) cursor = number + 1;
      }
    } else {
      number = nextFree();
    }

    return {
      path: file.path,
      title: parsed.title,
      content: file.content,
      number,
      warning,
    };
  });
}
