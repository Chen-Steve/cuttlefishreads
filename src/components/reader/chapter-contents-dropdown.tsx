"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import Link from "next/link";
import { ChevronDown, List, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChapterSummary } from "@/types";
import { chapterHref } from "@/lib/catalog-paths";
import { readerChromeBtnClass } from "./reader-chrome";

function chapterListLabel(chapter: ChapterSummary): string {
  if (!chapter.title) return `Chapter ${chapter.number}`;
  return `Chapter ${chapter.number}: ${chapter.title}`;
}

export function ChapterContentsDropdown({
  slug,
  chapters,
  currentChapter,
  placement = "down",
  catalogBase = "novels",
  navRef,
}: {
  slug: string;
  chapters: ChapterSummary[];
  currentChapter: number;
  placement?: "up" | "down";
  catalogBase?: import("@/lib/catalog-paths").CatalogBase;
  navRef: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>();
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

  // Match the chapter nav bar width and position on all screen sizes.
  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(undefined);
      return;
    }

    function updatePosition() {
      const nav = navRef.current;
      if (!nav) return;

      const rect = nav.getBoundingClientRect();
      const gap = 8;
      setPanelStyle({
        width: rect.width,
        left: rect.left,
        ...(placement === "up"
          ? { bottom: window.innerHeight - rect.top + gap, top: "auto" }
          : { top: rect.bottom + gap, bottom: "auto" }),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement, navRef]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Chapter contents"
        className={cn(readerChromeBtnClass, open && "bg-background text-foreground")}
      >
        <List className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
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
          style={panelStyle}
          className="fixed z-30 max-h-72 overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {chapters.map((chapter) => {
            const isCurrent = chapter.number === currentChapter;
            const label = chapterListLabel(chapter);
            const fullLabel = chapter.title
              ? `Chapter ${chapter.number}: ${chapter.title}`
              : `Chapter ${chapter.number}`;
            return (
              <Link
                key={chapter.number}
                ref={isCurrent ? currentRef : undefined}
                href={chapterHref(slug, chapter.number, catalogBase)}
                role="option"
                aria-selected={isCurrent}
                title={fullLabel}
                aria-label={fullLabel}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-background",
                  isCurrent && "bg-accent/10",
                )}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-medium",
                    isCurrent ? "text-accent" : "text-foreground",
                  )}
                >
                  {label}
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
