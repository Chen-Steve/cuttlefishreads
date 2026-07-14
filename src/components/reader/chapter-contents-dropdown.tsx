"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, List, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChapterSummary } from "@/types";

export function ChapterContentsDropdown({
  slug,
  chapters,
  currentChapter,
  placement = "down",
}: {
  slug: string;
  chapters: ChapterSummary[];
  currentChapter: number;
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      currentRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Chapter contents"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <List className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Contents</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-150",
            placement === "up" && "rotate-180",
            open && placement === "down" && "rotate-180",
            open && placement === "up" && "rotate-0",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Chapters"
          className={cn(
            "absolute left-1/2 z-30 max-h-72 w-72 -translate-x-1/2 overflow-y-auto rounded-xl border border-border bg-surface shadow-md sm:w-80",
            placement === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {chapters.map((chapter) => {
            const isCurrent = chapter.number === currentChapter;
            return (
              <Link
                key={chapter.number}
                ref={isCurrent ? currentRef : undefined}
                href={`/novels/${slug}/${chapter.number}`}
                role="option"
                aria-selected={isCurrent}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-background",
                  isCurrent && "bg-accent/10",
                )}
              >
                <span
                  className={cn(
                    "w-7 shrink-0 text-right text-xs font-semibold tabular-nums",
                    isCurrent ? "text-accent" : "text-muted",
                  )}
                >
                  {chapter.number}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-medium",
                    isCurrent ? "text-accent" : "text-foreground",
                  )}
                >
                  {chapter.title || `Chapter ${chapter.number}`}
                </span>
                {chapter.locked ? (
                  <>
                    <span className="sr-only">Locked</span>
                    <Lock
                      className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
