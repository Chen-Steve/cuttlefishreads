"use client";

import type { ReactNode, SyntheticEvent } from "react";

import { useReaderSettings } from "@/hooks/use-reader-settings";
import { readerContentStyle } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

function preventCopy(event: SyntheticEvent) {
  event.preventDefault();
}

export function ChapterContentFrame({ children }: { children: ReactNode }) {
  const { settings } = useReaderSettings();
  const style = readerContentStyle(settings);
  const padded = settings.background !== "default";

  return (
    <div
      className={cn(
        "flex flex-col select-none",
        padded && "rounded-xl px-4 py-5 sm:px-6 sm:py-6",
      )}
      style={style}
      onCopy={preventCopy}
      onCut={preventCopy}
      onContextMenu={preventCopy}
      onDragStart={preventCopy}
    >
      {children}
    </div>
  );
}
