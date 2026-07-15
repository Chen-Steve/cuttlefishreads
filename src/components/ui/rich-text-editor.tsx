"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { Bold, Italic, Superscript, Underline } from "lucide-react";

import { nextFootnoteLabel } from "@/lib/footnotes";
import {
  clipboardToMarkdown,
  domToMarkdown,
  markdownToEditorHtml,
} from "@/lib/html-to-markdown";
import { cn } from "@/lib/utils";

const toolbarButtonClass =
  "inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground";

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
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Applied to the editable area, e.g. a min-height. */
  className?: string;
  /** Show a toolbar control that inserts `[^n]` + a definition line. */
  enableFootnotes?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [initialHtml] = useState(() => markdownToEditorHtml(defaultValue));

  useEffect(() => {
    // Make Enter produce <p> instead of <div> so paragraphs stay consistent.
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  function sync() {
    if (editorRef.current && inputRef.current) {
      inputRef.current.value = domToMarkdown(editorRef.current);
    }
  }

  function exec(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    document.execCommand(command);
    sync();
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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec("bold")}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          className={toolbarButtonClass}
        >
          <Bold className="size-4" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec("italic")}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          className={toolbarButtonClass}
        >
          <Italic className="size-4" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => exec("underline")}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
          className={toolbarButtonClass}
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
              title="Insert footnote — type after the colon, e.g. [^1: your note]"
              aria-label="Insert footnote"
              className={toolbarButtonClass}
            >
              <Superscript className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </>
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
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        className={cn(
          "block w-full overflow-y-auto px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none",
          "[&>p+p]:mt-3 [&>div+div]:mt-3",
          "empty:before:pointer-events-none empty:before:text-muted/70 empty:before:content-[attr(data-placeholder)]",
          className,
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
