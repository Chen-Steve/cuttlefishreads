"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowDownUp, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { TabPanelShell } from "@/components/tab-panel-shell";
import { isScheduledUnlock } from "@/lib/unlock-countdown";
import { cn } from "@/lib/utils";
import type { ChapterListItem } from "@/types";
import { ChapterLockBadge } from "./chapter-lock-badge";

const CHAPTER_ORDER_STORAGE_KEY = "cf-chapter-order";
const CHAPTER_PAGE_SIZE = 50;

const chapterOrderListeners = new Set<() => void>();

function subscribeChapterOrder(onStoreChange: () => void) {
  chapterOrderListeners.add(onStoreChange);
  return () => {
    chapterOrderListeners.delete(onStoreChange);
  };
}

function notifyChapterOrderChange() {
  for (const listener of chapterOrderListeners) {
    listener();
  }
}

function readChapterOrderPreference(): boolean {
  try {
    return localStorage.getItem(CHAPTER_ORDER_STORAGE_KEY) === "newest";
  } catch {
    return false;
  }
}

function writeChapterOrderPreference(newestFirst: boolean) {
  try {
    localStorage.setItem(
      CHAPTER_ORDER_STORAGE_KEY,
      newestFirst ? "newest" : "oldest",
    );
    notifyChapterOrderChange();
  } catch {
    // Ignore private browsing / quota errors.
  }
}

function getChapterOrderServerSnapshot() {
  return false;
}

function useChapterOrderPreference() {
  return useSyncExternalStore(
    subscribeChapterOrder,
    readChapterOrderPreference,
    getChapterOrderServerSnapshot,
  );
}

export function ChapterOrderToggle({ className }: { className?: string }) {
  const newestFirst = useChapterOrderPreference();

  return (
    <button
      type="button"
      onClick={() => writeChapterOrderPreference(!newestFirst)}
      aria-pressed={newestFirst}
      aria-label={
        newestFirst
          ? "Chapter order: newest first. Click to show oldest first."
          : "Chapter order: oldest first. Click to show newest first."
      }
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        newestFirst && "text-accent",
        className,
      )}
    >
      <ArrowDownUp className="size-3.5" strokeWidth={1.75} aria-hidden />
      {newestFirst ? "First" : "Latest"}
    </button>
  );
}

export function ChapterList({
  slug,
  chapters,
  catalogBase = "novels",
  hideLockBadges = false,
}: {
  slug: string;
  chapters: ChapterListItem[];
  catalogBase?: import("@/lib/catalog-paths").CatalogBase;
  /** When true, skip lock UI on chapter rows. */
  hideLockBadges?: boolean;
}) {
  const newestFirst = useChapterOrderPreference();
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const sorted = [...chapters].sort((a, b) => a.number - b.number);
    return newestFirst ? sorted.reverse() : sorted;
  }, [chapters, newestFirst]);

  const totalPages = Math.max(1, Math.ceil(rows.length / CHAPTER_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(
    safePage * CHAPTER_PAGE_SIZE,
    safePage * CHAPTER_PAGE_SIZE + CHAPTER_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [newestFirst]);

  const hasChapters = chapters.length > 0;

  return (
    <TabPanelShell
      leftTab={
        <h2 className="flex h-9 items-center px-4 text-sm font-semibold tracking-tight text-foreground">
          Chapters:
          <span className="ml-1.5 text-xs font-normal text-muted">
            {chapters.length}
          </span>
        </h2>
      }
      rightTab={hasChapters ? <ChapterOrderToggle /> : undefined}
    >
      {hasChapters ? (
        <>
        <ol className="divide-y divide-border overflow-hidden rounded-b-xl">
          {pageRows.map((chapter) => (
            <li key={chapter.id}>
              <Link
                href={`/novels/${slug}/${chapter.number}`}
                className="group flex items-center gap-3 px-4 py-3 outline-offset-2 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    Chapter {chapter.number}
                    {chapter.title ? (
                      <span className="font-normal text-muted">
                        {" "}
                        · {chapter.title}
                      </span>
                    ) : null}
                  </span>
                  {!(chapter.locked && isScheduledUnlock(chapter.unlockAt)) ? (
                    <span className="block text-xs text-muted">
                      {chapter.publishedAt}
                    </span>
                  ) : null}
                </span>
                {chapter.adminAccess ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                    <ShieldCheck className="size-3" strokeWidth={2} aria-hidden />
                    Admin access
                  </span>
                ) : !hideLockBadges && chapter.locked ? (
                  <ChapterLockBadge chapter={chapter} />
                ) : null}
                <ChevronRight
                  className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ol>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
                safePage > 0 && "hover:border-accent hover:text-accent",
              )}
            >
              <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
              Previous
            </button>
            <p className="text-sm tabular-nums text-muted">
              {safePage + 1} / {totalPages}
            </p>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, current + 1))
              }
              disabled={safePage >= totalPages - 1}
              aria-label="Next page"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
                safePage < totalPages - 1 && "hover:border-accent hover:text-accent",
              )}
            >
              Next
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : null}
        </>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-muted">
          No chapters published yet.
        </p>
      )}
    </TabPanelShell>
  );
}
