"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownUp, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { WORKSPACE_BASE, workspaceKindFromPathname } from "@/lib/workspace";
import { ChapterRowActions } from "./chapter-admin-actions";

const CHAPTER_ORDER_STORAGE_KEY = "cf-admin-chapter-order";

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

export type AdminChapterRow = {
  id: string;
  number: number;
  title: string;
  is_free: boolean;
  coin_cost: number;
  is_published: boolean;
  unlock_at: string | null;
  word_count: number;
};

function formatUnlockDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChapterOrderToggle() {
  const newestFirst = useSyncExternalStore(
    subscribeChapterOrder,
    readChapterOrderPreference,
    getChapterOrderServerSnapshot,
  );

  return (
    <button
      type="button"
      onClick={() => writeChapterOrderPreference(!newestFirst)}
      aria-pressed={newestFirst}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        newestFirst && "border-accent/40 bg-accent/5 text-accent",
      )}
    >
      <ArrowDownUp className="size-4" strokeWidth={1.75} aria-hidden />
      {newestFirst ? "Newest" : "Oldest"}
    </button>
  );
}

function unlockLabel(chapter: Pick<AdminChapterRow, "is_free" | "unlock_at">) {
  if (chapter.unlock_at) {
    const date = formatUnlockDate(chapter.unlock_at);
    const released = new Date(chapter.unlock_at) <= new Date();
    return released ? `Released on ${date}` : `Releases on ${date}`;
  }
  if (chapter.is_free) return "Available now";
  return "No release date";
}

export function ChapterList({
  novelId,
  chapters,
}: {
  novelId: string;
  chapters: AdminChapterRow[];
}) {
  const pathname = usePathname();
  const base = WORKSPACE_BASE[workspaceKindFromPathname(pathname)];
  const newestFirst = useSyncExternalStore(
    subscribeChapterOrder,
    readChapterOrderPreference,
    getChapterOrderServerSnapshot,
  );

  const rows = useMemo(() => {
    const sorted = [...chapters].sort((a, b) => a.number - b.number);
    return newestFirst ? sorted.reverse() : sorted;
  }, [chapters, newestFirst]);

  if (chapters.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
        No chapters yet — click &quot;Add chapter&quot; to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map((chapter) => (
          <div
            key={chapter.id}
            className="flex items-center gap-4 px-4 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
                <span className="truncate">
                  {chapter.title
                    ? `Chapter ${chapter.number}: ${chapter.title}`
                    : `Chapter ${chapter.number}`}
                </span>
                <span className="shrink-0 text-xs font-normal tabular-nums text-muted">
                  {chapter.word_count.toLocaleString()} word
                  {chapter.word_count === 1 ? "" : "s"}
                </span>
                {chapter.is_published ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Published
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Draft
                  </span>
                )}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span>{unlockLabel(chapter)}</span>
                <span aria-hidden>·</span>
                {chapter.is_free ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Free</span>
                ) : (
                  <span>{chapter.coin_cost} cookies</span>
                )}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`${base}/novels/${novelId}/chapters/${chapter.id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
                <span className="hidden sm:inline">Edit</span>
              </Link>
              <ChapterRowActions
                chapterId={chapter.id}
                isPublished={chapter.is_published}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
