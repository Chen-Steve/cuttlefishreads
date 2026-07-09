"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { Bold, Italic, Underline } from "lucide-react";

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
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Applied to the editable area, e.g. a min-height. */
  className?: string;
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
