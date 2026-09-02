import { footnoteId, prepareChapterFootnotes } from "@/lib/footnotes";

import { ChapterContentFrame } from "./chapter-content-frame";
import {
  renderChapterParagraphs,
  renderFootnoteBacklinks,
  renderFootnoteContent,
  renderMarkdownParagraphs,
} from "./chapter-markdown";

export function ChapterContent({ paragraphs }: { paragraphs: string[] }) {
  const { paragraphs: body, footnotes } = prepareChapterFootnotes(paragraphs);
  const rendered =
    footnotes.length > 0
      ? renderChapterParagraphs(body, footnotes)
      : renderMarkdownParagraphs(body);

  return (
    <ChapterContentFrame>
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
    </ChapterContentFrame>
  );
}
