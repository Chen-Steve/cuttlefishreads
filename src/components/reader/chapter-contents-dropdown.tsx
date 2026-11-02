"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import Link from "next/link";
import { ChevronDown, List, Lock } from "lucide-react";

import { useReaderPanelPosition } from "@/hooks/use-reader-panel-position";
import { cn } from "@/lib/utils";
import type { ChapterSummary } from "@/types";
import { chapterHref } from "@/lib/catalog-paths";
import { readerChromeBtnClass } from "./reader-chrome";

function chapterListLabel(chapter: ChapterSummary): string {
  if (!chapter.title) return `Chapter ${chapter.number}`;
  return `Chapter ${chapter.number}: ${chapter.title}`;
}

type ChapterAccess = { bypass: boolean; unlocked: number[] };

const LIST_TTL_MS = 60_000;
const listCache = new Map<string, { at: number; chapters: ChapterSummary[] }>();
const listInflight = new Map<string, Promise<ChapterSummary[]>>();

function applyAccess(
  chapters: ChapterSummary[],
  access: ChapterAccess,
): ChapterSummary[] {
  if (!access.bypass && access.unlocked.length === 0) return chapters;
  const unlocked = new Set(access.unlocked);
  return chapters.map((chapter) => ({
    ...chapter,
    locked: access.bypass ? false : chapter.locked && !unlocked.has(chapter.number),
  }));
}

function loadPublicChapters(slug: string): Promise<ChapterSummary[]> {
  const cached = listCache.get(slug);
  if (cached && Date.now() - cached.at < LIST_TTL_MS) {
    return Promise.resolve(cached.chapters);
  }

  const pending = listInflight.get(slug);
  if (pending) return pending;

  const request = fetch(`/api/novels/${encodeURIComponent(slug)}/chapters`)
    .then(async (response) => {
      if (!response.ok) throw new Error("Couldn't load chapters.");
      const body = (await response.json()) as { chapters?: ChapterSummary[] };
      const chapters = body.chapters ?? [];
      listCache.set(slug, { at: Date.now(), chapters });
      return chapters;
    })
    .finally(() => {
      listInflight.delete(slug);
    });

  listInflight.set(slug, request);
  return request;
}

function loadChapterAccess(slug: string): Promise<ChapterAccess> {
  return fetch(`/api/novels/${encodeURIComponent(slug)}/unlocks`)
    .then(async (response) => {
      if (!response.ok) return { bypass: false, unlocked: [] };
      const body = (await response.json()) as Partial<ChapterAccess>;
      return {
        bypass: Boolean(body.bypass),
        unlocked: Array.isArray(body.unlocked) ? body.unlocked : [],
      };
    })
    .catch(() => ({ bypass: false, unlocked: [] }));
}

export function ChapterContentsDropdown({
  slug,
  currentChapter,
  placement = "down",
  navRef,
}: {
  slug: string;
  currentChapter: number;
  placement?: "up" | "down";
  navRef: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<ChapterSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const panelStyle = useReaderPanelPosition(open, placement, navRef);
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
  }, [open, chapters]);

  async function loadMenu() {
    setLoadError(false);
    if (!chapters) setLoading(true);
    try {
      const [list, access] = await Promise.all([
        loadPublicChapters(slug),
        loadChapterAccess(slug),
      ]);
      setChapters(applyAccess(list, access));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function onToggle() {
    const next = !open;
    setOpen(next);
    if (next) void loadMenu();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
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
          {loading && !chapters ? (
            <p className="px-3.5 py-2.5 text-sm text-muted">Loading chapters…</p>
          ) : null}
          {loadError && !chapters ? (
            <p className="px-3.5 py-2.5 text-sm text-muted">
              Couldn&apos;t load chapters.
            </p>
          ) : null}
          {chapters && chapters.length === 0 ? (
            <p className="px-3.5 py-2.5 text-sm text-muted">No chapters yet.</p>
          ) : null}
          {chapters?.map((chapter) => {
            const isCurrent = chapter.number === currentChapter;
            const label = chapterListLabel(chapter);
            const fullLabel = chapter.title
              ? `Chapter ${chapter.number}: ${chapter.title}`
              : `Chapter ${chapter.number}`;
            return (
              <Link
                key={chapter.number}
                ref={isCurrent ? currentRef : undefined}
                prefetch={false}
                href={chapterHref(slug, chapter.number)}
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
