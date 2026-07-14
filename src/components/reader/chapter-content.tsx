"use client";

import { useReaderSettings } from "@/hooks/use-reader-settings";
import { readerContentStyle } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

import { renderMarkdownParagraphs } from "./chapter-markdown";

export function ChapterContent({ paragraphs }: { paragraphs: string[] }) {
  const { settings } = useReaderSettings();
  const style = readerContentStyle(settings);
  const padded = settings.background !== "default";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl",
        padded && "px-4 py-5 sm:px-6 sm:py-6",
      )}
      style={style}
    >
      {renderMarkdownParagraphs(paragraphs).map((children, index) => (
        <p key={index}>{children}</p>
      ))}
    </div>
  );
}
