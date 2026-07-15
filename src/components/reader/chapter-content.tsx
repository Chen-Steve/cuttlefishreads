"use client";

import type { SyntheticEvent } from "react";
import { useReaderSettings } from "@/hooks/use-reader-settings";
import { footnoteId, prepareChapterFootnotes } from "@/lib/footnotes";
import { readerContentStyle } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

import {
  renderChapterParagraphs,
  renderFootnoteBacklinks,
  renderFootnoteContent,
  renderMarkdownParagraphs,
} from "./chapter-markdown";

function preventCopy(event: SyntheticEvent) {
  event.preventDefault();
}

export function ChapterContent({ paragraphs }: { paragraphs: string[] }) {
  const { settings } = useReaderSettings();
  const style = readerContentStyle(settings);
  const padded = settings.background !== "default";
  const { paragraphs: body, footnotes } = prepareChapterFootnotes(paragraphs);
  const rendered =
    footnotes.length > 0
      ? renderChapterParagraphs(body, footnotes)
      : renderMarkdownParagraphs(body);

  return (
    <div
      className={cn(
        "flex flex-col select-none rounded-xl",
        padded && "px-4 py-5 sm:px-6 sm:py-6",
      )}
      style={style}
      onCopy={preventCopy}
      onCut={preventCopy}
      onContextMenu={preventCopy}
      onDragStart={preventCopy}
    >
      {rendered.map((children, index) => (
        <p key={index}>{children}</p>
      ))}

      {footnotes.length > 0 ? (
        <section
          aria-label="Footnotes"
          className="mt-8 border-t border-current/20 pt-4 text-[0.92em]"
        >
          <ol className="flex list-none flex-col gap-3 p-0">
            {footnotes.map((footnote) => (
              <li
                key={footnote.safeId}
                id={footnoteId(footnote.safeId)}
                className="scroll-mt-4 break-words"
              >
                <span className="mr-1.5 font-medium tabular-nums">
                  {footnote.label}.
                </span>
                {renderFootnoteContent(footnote.content)}
                {renderFootnoteBacklinks(footnote)}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
