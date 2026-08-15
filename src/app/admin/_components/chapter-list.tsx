"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownUp, ChevronLeft, FolderUp, Pencil, PlusCircle } from "lucide-react";

import { TabPanelShell } from "@/components/tab-panel-shell";
import { cn } from "@/lib/utils";
import { WORKSPACE_BASE, workspaceKindFromPathname } from "@/lib/workspace";
import { ChapterRowActions, PublishAllButton } from "./chapter-admin-actions";

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
      aria-label={
        newestFirst
          ? "Chapter order: newest first. Click to show oldest first."
          : "Chapter order: oldest first. Click to show newest first."
      }
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        newestFirst ? "text-accent" : "text-muted hover:text-foreground",
      )}
    >
      <ArrowDownUp className="size-3.5" strokeWidth={1.75} aria-hidden />
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
  novelTitle,
  chapters,
  backHref,
  addHref,
  bulkHref,
  draftCount,
}: {
  novelId: string;
  novelTitle: string;
  chapters: AdminChapterRow[];
  backHref: string;
  addHref: string;
  bulkHref: string;
  draftCount: number;
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

  const hasChapters = chapters.length > 0;

  return (
    <TabPanelShell
      leftTab={
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1 px-4 text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
          Back to novels
        </Link>
      }
      rightTab={
        <div className="flex items-stretch">
          <PublishAllButton novelId={novelId} draftCount={draftCount} />
          {hasChapters ? <ChapterOrderToggle /> : null}
          <Link
            href={bulkHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <FolderUp className="size-4" strokeWidth={1.75} aria-hidden />
            Bulk upload
          </Link>
          <Link
            href={addHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
            Add chapter
          </Link>
        </div>
      }
    >
      <h1
        className="px-4 pt-3 text-sm font-semibold tracking-tight text-foreground"
        title={novelTitle}
      >
        {novelTitle.length > 50 ? `${novelTitle.slice(0, 50)}...` : novelTitle}
        <span className="ml-1.5 text-xs font-normal text-muted">
          {chapters.length}
        </span>
      </h1>
      {hasChapters ? (
        <div className="mt-2 flex flex-col divide-y divide-border">
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
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">
                    {chapter.word_count.toLocaleString()} word
                    {chapter.word_count === 1 ? "" : "s"}
                  </span>
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
      ) : (
        <p className="px-4 py-8 text-center text-sm text-muted">
          No chapters yet — click &quot;Add chapter&quot; or &quot;Bulk upload&quot;
          to get started.
        </p>
      )}
    </TabPanelShell>
  );
}
