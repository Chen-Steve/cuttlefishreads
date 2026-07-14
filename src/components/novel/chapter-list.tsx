"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowDownUp, ChevronRight, ShieldCheck } from "lucide-react";

import { isScheduledUnlock } from "@/lib/unlock-countdown";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types";
import { ChapterLockBadge } from "./chapter-lock-badge";

const CHAPTER_ORDER_STORAGE_KEY = "cf-chapter-order";

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

export function ChapterOrderToggle() {
  const newestFirst = useChapterOrderPreference();

  return (
    <button
      type="button"
      onClick={() => writeChapterOrderPreference(!newestFirst)}
      aria-pressed={newestFirst}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        newestFirst && "border-accent/40 bg-accent/5 text-accent",
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
}: {
  slug: string;
  chapters: Chapter[];
}) {
  const newestFirst = useChapterOrderPreference();

  const rows = useMemo(() => {
    const sorted = [...chapters].sort((a, b) => a.number - b.number);
    return newestFirst ? sorted.reverse() : sorted;
  }, [chapters, newestFirst]);

  if (chapters.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        No chapters published yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {rows.map((chapter) => (
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
              ) : chapter.locked ? (
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
  );
}
