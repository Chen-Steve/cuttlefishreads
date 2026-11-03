"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowDownUp, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { TabPanelShell } from "@/components/tab-panel-shell";
import { useChapterOrder } from "@/hooks/use-chapter-order";
import { CHAPTER_LIST_PAGE_SIZE } from "@/lib/chapter-list-page";
import { isScheduledUnlock } from "@/lib/unlock-countdown";
import { cn } from "@/lib/utils";
import type { ChapterListRow, ChapterLockUpdate } from "@/types";
import { ChapterLockBadge } from "./chapter-lock-badge";

const CHAPTER_ORDER_STORAGE_KEY = "cf-chapter-order";

function ChapterOrderToggle({ className }: { className?: string }) {
  const [newestFirst, setNewestFirst] = useChapterOrder(
    CHAPTER_ORDER_STORAGE_KEY,
  );

  return (
    <button
      type="button"
      onClick={() => setNewestFirst(!newestFirst)}
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

const ChapterAccessContext = createContext<
  (access: ChapterLockUpdate[]) => void
>(() => {});

function mergeLockUpdates(
  current: ChapterLockUpdate[],
  incoming: ChapterLockUpdate[],
): ChapterLockUpdate[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((update) => [update.id, update]));
  let changed = false;
  for (const update of incoming) {
    const previous = byId.get(update.id);
    if (
      previous &&
      previous.locked === update.locked &&
      previous.adminAccess === update.adminAccess
    ) {
      continue;
    }
    byId.set(update.id, update);
    changed = true;
  }
  return changed ? [...byId.values()] : current;
}

function applyLockUpdates(
  chapters: ChapterListRow[],
  updates: ChapterLockUpdate[],
): ChapterListRow[] {
  if (updates.length === 0) return chapters;
  const byId = new Map(updates.map((update) => [update.id, update]));
  let changed = false;
  const next = chapters.map((chapter) => {
    const update = byId.get(chapter.id);
    if (
      !update ||
      (chapter.locked === update.locked &&
        chapter.adminAccess === update.adminAccess)
    ) {
      return chapter;
    }
    changed = true;
    return {
      ...chapter,
      locked: update.locked,
      adminAccess: update.adminAccess,
    };
  });
  return changed ? next : chapters;
}

/** Applies purchased and admin locks onto the chapters already on screen. */
export function ChapterAccessPatch({
  access,
}: {
  access: ChapterLockUpdate[];
}) {
  const apply = useContext(ChapterAccessContext);
  useEffect(() => {
    apply(access);
  }, [access, apply]);
  return null;
}

export function ChapterList({
  slug,
  chapters,
  totalCount,
  children,
}: {
  slug: string;
  /** Oldest-first first page. Later pages load when the reader opens them. */
  chapters: ChapterListRow[];
  totalCount: number;
  /** Streams a lock patch without sending the chapter rows again. */
  children?: ReactNode;
}) {
  const [newestFirst] = useChapterOrder(CHAPTER_ORDER_STORAGE_KEY);
  const [page, setPage] = useState(0);
  const [pageOrder, setPageOrder] = useState(newestFirst);
  if (pageOrder !== newestFirst) {
    setPageOrder(newestFirst);
    setPage(0);
  }
  const [chaptersForSlug, setChaptersForSlug] = useState(slug);
  const [lockUpdates, setLockUpdates] = useState<ChapterLockUpdate[]>([]);
  const [fetched, setFetched] = useState<{
    key: string;
    chapters: ChapterListRow[];
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  if (chaptersForSlug !== slug) {
    setChaptersForSlug(slug);
    setLockUpdates([]);
    setFetched(null);
    setPage(0);
    setFailedKey(null);
  }

  const applyAccess = useCallback((access: ChapterLockUpdate[]) => {
    setLockUpdates((current) => mergeLockUpdates(current, access));
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / CHAPTER_LIST_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  if (page !== safePage) setPage(safePage);

  const singlePage = totalCount <= CHAPTER_LIST_PAGE_SIZE;
  const serverPage = !newestFirst && safePage === 0;
  const needsFetch = totalCount > 0 && !singlePage && !serverPage;
  const requestKey = `${newestFirst ? "newest" : "oldest"}:${safePage}`;

  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();
    const key = requestKey;
    const params = new URLSearchParams({
      page: String(safePage),
      order: newestFirst ? "newest" : "oldest",
    });
    const listUrl = `/api/novels/${encodeURIComponent(slug)}/chapter-list?${params}`;
    const lockUrl = `/api/novels/${encodeURIComponent(slug)}/chapter-locks?${params}`;

    Promise.all([
      fetch(listUrl, { signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("Couldn't load chapters.");
        const body = (await response.json()) as { chapters?: ChapterListRow[] };
        if (!Array.isArray(body.chapters)) throw new Error("Couldn't load chapters.");
        return body.chapters;
      }),
      fetch(lockUrl, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return [] as ChapterLockUpdate[];
          const body = (await response.json()) as { updates?: ChapterLockUpdate[] };
          return Array.isArray(body.updates) ? body.updates : [];
        })
        .catch(() => [] as ChapterLockUpdate[]),
    ])
      .then(([nextChapters, updates]) => {
        if (controller.signal.aborted) return;
        setFetched({ key, chapters: nextChapters });
        setLockUpdates((current) => mergeLockUpdates(current, updates));
        setFailedKey((current) => (current === key ? null : current));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailedKey(key);
      });

    return () => controller.abort();
  }, [attempt, needsFetch, newestFirst, requestKey, safePage, slug]);

  const pageRows = useMemo(() => {
    if (totalCount === 0) return [];
    if (singlePage) return newestFirst ? [...chapters].reverse() : chapters;
    if (serverPage) return chapters;
    return fetched?.key === requestKey ? fetched.chapters : null;
  }, [
    chapters,
    fetched,
    newestFirst,
    requestKey,
    serverPage,
    singlePage,
    totalCount,
  ]);

  const visibleChapters = useMemo(
    () => (pageRows == null ? null : applyLockUpdates(pageRows, lockUpdates)),
    [lockUpdates, pageRows],
  );

  const loadError = failedKey === requestKey;
  const hasChapters = totalCount > 0;

  return (
    <ChapterAccessContext.Provider value={applyAccess}>
      {children}
      <TabPanelShell
        leftTab={
          <h2 className="flex h-9 items-center px-4 text-sm font-semibold tracking-tight text-foreground">
            Chapters:
            <span className="ml-1.5 text-xs font-normal text-muted">
              {totalCount}
            </span>
          </h2>
        }
        rightTab={hasChapters ? <ChapterOrderToggle /> : undefined}
      >
      {hasChapters ? (
        <>
        {visibleChapters == null ? (
          <p className="px-4 py-8 text-center text-sm text-muted" role="status">
            {loadError ? (
              <>
                Couldn&apos;t load chapters.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setFailedKey(null);
                    setAttempt((current) => current + 1);
                  }}
                  className="font-medium text-foreground underline underline-offset-2 hover:text-accent"
                >
                  Retry
                </button>
              </>
            ) : (
              "Loading chapters"
            )}
          </p>
        ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-b-xl">
          {visibleChapters.map((chapter) => (
            <li key={chapter.id}>
              <Link
                href={`/novels/${slug}/${chapter.number}`}
                prefetch={false}
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
                ) : !chapter.locked ? null : (
                  <ChapterLockBadge chapter={chapter} />
                )}
                <ChevronRight
                  className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ol>
        )}
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
    </ChapterAccessContext.Provider>
  );
}
