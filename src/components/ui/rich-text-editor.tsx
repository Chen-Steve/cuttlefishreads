"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Bold, Italic, Superscript, Underline } from "lucide-react";

import { countChapterWords } from "@/lib/chapter-words";
import { nextFootnoteLabel } from "@/lib/footnotes";
import {
  clipboardToMarkdown,
  domToMarkdown,
  markdownToEditorHtml,
} from "@/lib/html-to-markdown";
import { cn } from "@/lib/utils";

const toolbarButtonClass =
  "inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground";
const toolbarButtonActiveClass = "bg-surface text-foreground";

type FormatState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

const INACTIVE_FORMATS: FormatState = {
  bold: false,
  italic: false,
  underline: false,
};

function editorIsEmpty(el: HTMLElement): boolean {
  return el.innerText.replace(/\u00a0/g, " ").trim().length === 0;
}

function readFormatState(editor: HTMLElement): FormatState {
  const selection = window.getSelection();
  if (!selection?.anchorNode || !editor.contains(selection.anchorNode)) {
    return INACTIVE_FORMATS;
  }
  try {
    return {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    };
  } catch {
    return INACTIVE_FORMATS;
  }
}

function formatsEqual(a: FormatState, b: FormatState): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline;
}

/**
 * WYSIWYG editor for bold / italic / underline that submits Markdown.
 * Formatting is shown as-is (like Google Docs); the hidden input carries the
 * Markdown string so server actions and the reader keep working unchanged.
 */
export function RichTextEditor({
  id,
  name,
  defaultValue = "",
  placeholder,
  className,
  enableFootnotes = false,
  showWordCount = false,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Applied to the editor shell, e.g. a min-height. */
  className?: string;
  /** Show a toolbar control that inserts `[^n]` + a definition line. */
  enableFootnotes?: boolean;
  /** Live word count matching the stored chapter word_count. */
  showWordCount?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [initialHtml] = useState(() => markdownToEditorHtml(defaultValue));
  const [empty, setEmpty] = useState(() => defaultValue.trim().length === 0);
  const [wordCount, setWordCount] = useState(() => countChapterWords(defaultValue));
  const [formats, setFormats] = useState<FormatState>(INACTIVE_FORMATS);

  useEffect(() => {
    // Make Enter produce <p> instead of <div> so paragraphs stay consistent.
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  useEffect(() => {
    function onSelectionChange() {
      const editor = editorRef.current;
      if (!editor) return;
      const next = readFormatState(editor);
      setFormats((prev) => (formatsEqual(prev, next) ? prev : next));
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  function sync() {
    const editor = editorRef.current;
    const input = inputRef.current;
    if (!editor || !input) return;

    const markdown = domToMarkdown(editor);
    input.value = markdown;

    const nextEmpty = editorIsEmpty(editor);
    setEmpty((prev) => (prev === nextEmpty ? prev : nextEmpty));

    if (showWordCount) {
      const words = countChapterWords(markdown);
      setWordCount((prev) => (prev === words ? prev : words));
    }
  }

  function exec(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    document.execCommand(command);
    sync();
    const editor = editorRef.current;
    if (editor) {
      const next = readFormatState(editor);
      setFormats((prev) => (formatsEqual(prev, next) ? prev : next));
    }
  }

  function insertFootnote() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    const selectedText =
      selection?.toString().replace(/\s+/g, " ").trim() ?? "";
    const label = nextFootnoteLabel(domToMarkdown(editor));
    // Inline form: [^1: note text] — definition travels with the marker.
    const snippet = selectedText
      ? `[^${label}: ${selectedText}]`
      : `[^${label}: ]`;

    document.execCommand("insertText", false, snippet);

    // Empty note — put the caret before `]` so the author can type the note.
    if (!selectedText && selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (
        range.startContainer.nodeType === Node.TEXT_NODE &&
        range.startOffset > 0
      ) {
        range.setStart(range.startContainer, range.startOffset - 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    sync();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const markdown = clipboardToMarkdown(
      event.clipboardData.getData("text/html"),
      event.clipboardData.getData("text/plain"),
    );
    if (markdown) {
      // Round-trip through Markdown so only bold/italic/underline survive.
      document.execCommand("insertHTML", false, markdownToEditorHtml(markdown));
    }
    sync();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!enableFootnotes) return;
    if (!event.altKey || !(event.metaKey || event.ctrlKey)) return;
    if (event.key.toLowerCase() !== "f") return;
    event.preventDefault();
    insertFootnote();
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-background focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec("bold")}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          aria-pressed={formats.bold}
          className={cn(toolbarButtonClass, formats.bold && toolbarButtonActiveClass)}
        >
          <Bold className="size-4" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec("italic")}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          aria-pressed={formats.italic}
          className={cn(toolbarButtonClass, formats.italic && toolbarButtonActiveClass)}
        >
          <Italic className="size-4" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec("underline")}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
          aria-pressed={formats.underline}
          className={cn(toolbarButtonClass, formats.underline && toolbarButtonActiveClass)}
        >
          <Underline className="size-4" strokeWidth={2} aria-hidden />
        </button>
        {enableFootnotes ? (
          <>
            <span
              aria-hidden
              className="mx-0.5 h-4 w-px shrink-0 bg-border"
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={insertFootnote}
              title="Insert footnote (Ctrl+Alt+F) — type after the colon, e.g. [^1: your note]"
              aria-label="Insert footnote"
              className={toolbarButtonClass}
            >
              <Superscript className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </>
        ) : null}
        {showWordCount ? (
          <span className="ml-auto px-1.5 text-xs tabular-nums text-muted">
            {wordCount.toLocaleString()} word{wordCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        aria-placeholder={placeholder}
        data-placeholder={placeholder}
        data-empty={empty ? "true" : "false"}
        onInput={sync}
        onBlur={sync}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none",
          "[&>p+p]:mt-3 [&>div+div]:mt-3",
          "before:pointer-events-none before:absolute before:inset-x-3.5 before:top-3 before:text-muted/70 before:content-none",
          "data-[empty=true]:before:content-[attr(data-placeholder)]",
        )}
      />
      <input
        type="hidden"
        name={name}
        ref={inputRef}
        defaultValue={defaultValue}
      />
    </div>
  );
}
