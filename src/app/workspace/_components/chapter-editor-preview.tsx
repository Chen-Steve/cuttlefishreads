"use client";

import { footnoteId, prepareChapterFootnotes } from "@/lib/footnotes";
import {
  renderChapterParagraphs,
  renderFootnoteBacklinks,
  renderFootnoteContent,
  renderMarkdownParagraphs,
  splitTextParagraphs,
} from "@/components/reader/chapter-markdown";

/** Workspace-only reader preview (no scrape bait or copy protection). */
export function ChapterEditorPreview({ content }: { content: string }) {
  const paragraphs = splitTextParagraphs(content);
  const { paragraphs: body, footnotes } = prepareChapterFootnotes(paragraphs);
  const rendered =
    footnotes.length > 0
      ? renderChapterParagraphs(body, footnotes)
      : renderMarkdownParagraphs(body);

  if (paragraphs.length === 0) {
    return (
      <p className="px-3.5 py-3 text-sm text-muted">Nothing to preview yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3.5 py-3 text-sm leading-relaxed text-foreground">
      {rendered.map((children, index) => (
        <p key={index}>{children}</p>
      ))}
      {footnotes.length > 0 ? (
        <section
          aria-label="Footnotes"
          className="mt-4 border-t border-border pt-3 text-[0.92em]"
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
