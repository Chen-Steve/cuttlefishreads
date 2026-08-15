import { htmlToChapterMarkdown } from "@/lib/html-to-markdown";
import {
  assignChapterNumbers,
  decodeTextBuffer,
  extensionOf,
  isChapterImportFile,
  isZipFile,
  markdownFileToChapterMarkdown,
  MAX_IMPORT_CHAPTERS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_TOTAL_BYTES,
  shouldSkipImportPath,
  textToChapterMarkdown,
  type NumberedImport,
} from "@/lib/chapter-import";

export type ImportIssue = { path: string; message: string };

export type PreparedChapterImport = NumberedImport & {
  id: string;
  wordCount: number;
};

type SourceFile = {
  path: string;
  buffer: ArrayBuffer;
};

function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}]+/gu);
  return matches?.length ?? 0;
}

function localName(el: Element): string {
  return (el.localName || el.tagName.replace(/^.*:/, "")).toLowerCase();
}

function wVal(el: Element): string | null {
  return (
    el.getAttribute("w:val") ??
    el.getAttribute("val") ??
    el.getAttributeNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "val",
    )
  );
}

function isOn(el: Element | null): boolean {
  if (!el) return false;
  const val = wVal(el)?.toLowerCase();
  if (val == null) return true;
  return val !== "0" && val !== "false" && val !== "off" && val !== "none";
}

function child(el: Element, name: string): Element | null {
  return [...el.children].find((node) => localName(node) === name) ?? null;
}

function descendants(el: Element, name: string): Element[] {
  return [...el.getElementsByTagName("*")].filter((node) => localName(node) === name);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type RunStyle = { bold: boolean; italic: boolean; underline: boolean };

function readRunStyle(rPr: Element | null, inherited: RunStyle): RunStyle {
  if (!rPr) return inherited;
  const next = { ...inherited };
  const b = child(rPr, "b");
  const i = child(rPr, "i");
  const u = child(rPr, "u");
  if (b) next.bold = isOn(b);
  if (i) next.italic = isOn(i);
  if (u) next.underline = isOn(u);
  return next;
}

function wrapHtml(text: string, style: RunStyle): string {
  if (!text) return "";
  let html = escapeHtml(text);
  if (style.bold) html = `<strong>${html}</strong>`;
  if (style.italic) html = `<em>${html}</em>`;
  if (style.underline) html = `<u>${html}</u>`;
  return html;
}

function parseDocxStyles(xml: string | null): Map<string, RunStyle> {
  const styles = new Map<string, RunStyle>();
  if (!xml) return styles;
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  for (const styleEl of descendants(doc.documentElement, "style")) {
    const id =
      styleEl.getAttribute("w:styleId") ??
      styleEl.getAttribute("styleId") ??
      "";
    if (!id) continue;
    const rPr = child(styleEl, "rPr");
    const name =
      child(styleEl, "name")?.getAttribute("w:val") ??
      child(styleEl, "name")?.getAttribute("val") ??
      id;
    const heading = /heading|title/i.test(id) || /heading|title/i.test(name);
    styles.set(
      id,
      readRunStyle(rPr, {
        bold: heading,
        italic: false,
        underline: false,
      }),
    );
  }
  return styles;
}

function serializeDocxNode(el: Element, inherited: RunStyle, styles: Map<string, RunStyle>): string {
  const name = localName(el);
  if (name === "t") return wrapHtml(el.textContent ?? "", inherited);
  if (name === "tab") return wrapHtml("\t", inherited);
  if (name === "br" || name === "cr") return "<br>";
  if (
    name === "drawing" ||
    name === "pict" ||
    name === "footnote" ||
    name === "endnote" ||
    name === "del" ||
    name === "movefrom" ||
    name === "ppr" ||
    name === "rpr" ||
    name === "sectpr" ||
    name === "tblpr" ||
    name === "trpr" ||
    name === "tcpr"
  ) {
    return "";
  }

  let style = inherited;
  if (name === "r") {
    style = readRunStyle(child(el, "rPr"), inherited);
  } else if (name === "p") {
    const pPr = child(el, "pPr");
    const pStyleId =
      (pPr && child(pPr, "pStyle") && wVal(child(pPr, "pStyle")!)) || "";
    const fromStyle = pStyleId ? styles.get(pStyleId) : undefined;
    style = readRunStyle(pPr ? child(pPr, "rPr") : null, fromStyle ?? inherited);
  }

  let inner = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (name === "t") inner += wrapHtml(node.textContent ?? "", style);
      continue;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      inner += serializeDocxNode(node as Element, style, styles);
    }
  }

  if (name === "p") return `<p>${inner}</p>`;
  if (name === "tr") return `${inner}<br>`;
  return inner;
}

function docxToChapterMarkdown(documentXml: string, stylesXml: string | null): string {
  const doc = new DOMParser().parseFromString(documentXml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("This Word file could not be read.");
  }
  const body = descendants(doc.documentElement, "body")[0];
  if (!body) throw new Error("This Word file has no document body.");
  const styles = parseDocxStyles(stylesXml);
  const html = serializeDocxNode(body, { bold: false, italic: false, underline: false }, styles);
  return htmlToChapterMarkdown(html);
}

async function parseDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) throw new Error("This is not a valid .docx file.");
  const documentXml = await documentFile.async("text");
  const stylesXml = (await zip.file("word/styles.xml")?.async("text")) ?? null;
  return docxToChapterMarkdown(documentXml, stylesXml);
}

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bold: boolean;
  italic: boolean;
};

function pdfItemsToMarkdown(items: PdfTextItem[]): string {
  if (items.length === 0) return "";

  const sorted = [...items].sort((a, b) => {
    const yDelta = b.y - a.y;
    if (Math.abs(yDelta) > Math.max(a.height, b.height, 1) * 0.35) return yDelta;
    return a.x - b.x;
  });

  type Line = { y: number; height: number; items: PdfTextItem[] };
  const lines: Line[] = [];
  for (const item of sorted) {
    const line = lines[lines.length - 1];
    const sameLine =
      line && Math.abs(line.y - item.y) <= Math.max(line.height, item.height, 1) * 0.45;
    if (sameLine) {
      line.items.push(item);
      line.height = Math.max(line.height, item.height);
    } else {
      lines.push({ y: item.y, height: item.height || 12, items: [item] });
    }
  }

  const paragraphs: string[] = [];
  let current: string[] = [];
  let prev: Line | null = null;

  for (const line of lines) {
    const styled = line.items
      .map((item, index) => {
        const prevItem = line.items[index - 1];
        const gap = prevItem ? item.x - (prevItem.x + prevItem.width) : 0;
        const space = gap > Math.max(item.height, 4) * 0.25 ? " " : "";
        return space + wrapPdfRun(item.str, item.bold, item.italic);
      })
      .join("")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!styled) continue;

    const gap = prev ? prev.y - line.y : 0;
    const paraBreak = prev != null && gap > prev.height * 1.45;
    if (paraBreak && current.length > 0) {
      paragraphs.push(current.join(" "));
      current = [];
    }
    current.push(styled);
    prev = line;
  }
  if (current.length > 0) paragraphs.push(current.join(" "));
  return paragraphs.join("\n\n");
}

function wrapPdfRun(text: string, bold: boolean, italic: boolean): string {
  if (!text) return "";
  let wrapped = text;
  if (bold) wrapped = `**${wrapped}**`;
  if (italic) wrapped = `_${wrapped}_`;
  return wrapped;
}

async function parsePdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    useSystemFonts: true,
  });
  const pdf = await task.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str) continue;
      const transform = raw.transform;
      const fontName = "fontName" in raw ? String(raw.fontName) : "";
      items.push({
        str: raw.str,
        x: transform[4],
        y: transform[5],
        width: raw.width,
        height: raw.height || Math.abs(transform[3]) || 12,
        bold: /bold|black|heavy/i.test(fontName),
        italic: /italic|oblique/i.test(fontName),
      });
    }
    const pageText = pdfItemsToMarkdown(items);
    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function parseSource(source: SourceFile): Promise<string> {
  const ext = extensionOf(source.path);
  if (ext === "txt") return textToChapterMarkdown(decodeTextBuffer(source.buffer));
  if (ext === "md") return markdownFileToChapterMarkdown(decodeTextBuffer(source.buffer));
  if (ext === "docx") return parseDocxBuffer(source.buffer);
  if (ext === "pdf") return parsePdfBuffer(source.buffer);
  throw new Error(`Unsupported file type: .${ext}`);
}

async function expandZip(path: string, buffer: ArrayBuffer): Promise<SourceFile[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const sources: SourceFile[] = [];
  let total = 0;

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of entries) {
    const nestedPath = `${path.replace(/\.zip$/i, "")}/${entry.name}`;
    if (shouldSkipImportPath(entry.name) || !isChapterImportFile(entry.name)) continue;
    if (isZipFile(entry.name)) continue;

    const nested = await entry.async("arraybuffer");
    total += nested.byteLength;
    if (nested.byteLength > MAX_IMPORT_FILE_BYTES) {
      throw new Error(`${entry.name} is larger than 15 MB.`);
    }
    if (total > MAX_IMPORT_TOTAL_BYTES) {
      throw new Error("That zip is too large to unpack (over 80 MB of files).");
    }
    sources.push({ path: nestedPath, buffer: nested });
  }

  return sources;
}

async function collectDroppedEntry(
  entry: FileSystemEntry,
  out: File[],
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    out.push(file);
    return;
  }
  if (!entry.isDirectory) return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const readBatch = () =>
    new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

  let batch = await readBatch();
  while (batch.length > 0) {
    for (const child of batch) {
      await collectDroppedEntry(child, out);
    }
    batch = await readBatch();
  }
}

export async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = [];
  const items = [...dataTransfer.items];
  if (items.some((item) => typeof item.webkitGetAsEntry === "function")) {
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        await collectDroppedEntry(entry, files);
      } else if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) return files;
  }
  return [...dataTransfer.files];
}

async function filesToSources(files: File[]): Promise<{ sources: SourceFile[]; issues: ImportIssue[] }> {
  const sources: SourceFile[] = [];
  const issues: ImportIssue[] = [];
  let total = 0;

  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    if (shouldSkipImportPath(path) && !isZipFile(file.name, file.type)) continue;

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      issues.push({ path, message: "File is larger than 15 MB." });
      continue;
    }

    const buffer = await file.arrayBuffer();
    total += buffer.byteLength;
    if (total > MAX_IMPORT_TOTAL_BYTES) {
      issues.push({ path, message: "Upload exceeded the 80 MB total size limit." });
      break;
    }

    if (isZipFile(file.name, file.type)) {
      try {
        const nested = await expandZip(path, buffer);
        if (nested.length === 0) {
          issues.push({
            path,
            message: "No .txt, .md, .docx, or .pdf files found in this zip.",
          });
        }
        sources.push(...nested);
      } catch (error) {
        issues.push({
          path,
          message: error instanceof Error ? error.message : "Could not open this zip.",
        });
      }
      continue;
    }

    if (!isChapterImportFile(path)) {
      continue;
    }

    sources.push({ path, buffer });
  }

  return { sources, issues };
}

export async function prepareChapterImports(
  files: File[],
  nextNumber: number,
  existingNumbers: Iterable<number>,
): Promise<{ chapters: PreparedChapterImport[]; issues: ImportIssue[] }> {
  const { sources, issues } = await filesToSources(files);
  const parsed: Array<{ path: string; content: string }> = [];

  for (const source of sources) {
    try {
      const content = (await parseSource(source)).trim();
      if (!content) {
        issues.push({ path: source.path, message: "File is empty after conversion." });
        continue;
      }
      parsed.push({ path: source.path, content });
    } catch (error) {
      issues.push({
        path: source.path,
        message: error instanceof Error ? error.message : "Could not read this file.",
      });
    }
  }

  parsed.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }));

  if (parsed.length > MAX_IMPORT_CHAPTERS) {
    issues.push({
      path: "",
      message: `Only the first ${MAX_IMPORT_CHAPTERS} chapters will be imported (${parsed.length} found).`,
    });
  }

  const limited = parsed.slice(0, MAX_IMPORT_CHAPTERS);
  const numbered = assignChapterNumbers(limited, nextNumber, existingNumbers);
  return {
    chapters: numbered.map((chapter) => ({
      ...chapter,
      id: crypto.randomUUID(),
      wordCount: countWords(chapter.content),
    })),
    issues,
  };
}
