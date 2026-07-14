"use client";

import type { SyntheticEvent } from "react";
import { useReaderSettings } from "@/hooks/use-reader-settings";
import { readerContentStyle } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

import { renderMarkdownParagraphs } from "./chapter-markdown";

function preventCopy(event: SyntheticEvent) {
  event.preventDefault();
}

export function ChapterContent({ paragraphs }: { paragraphs: string[] }) {
  const { settings } = useReaderSettings();
  const style = readerContentStyle(settings);
  const padded = settings.background !== "default";

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
      {renderMarkdownParagraphs(paragraphs).map((children, index) => (
        <p key={index}>{children}</p>
      ))}
    </div>
  );
}
