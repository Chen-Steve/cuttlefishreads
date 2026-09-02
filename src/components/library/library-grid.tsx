"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";

import { removeBookmarks, toggleBookmark } from "@/app/(main)/novels/actions";
import {
  genresExcludingCoverBadges,
  NovelCover,
  COVER_SIZES_ROW,
} from "@/components/novel/novel-cover";
import {
  clearReadingProgress,
  listReadingProgress,
  readReadingProgress,
  recordReadingProgress,
  type ReadingProgressEntry,
  type ReadingProgressMap,
} from "@/lib/reading-progress";
import {
  chapterPublicHref,
  novelPublicHref,
} from "@/lib/catalog-paths";
import { cn } from "@/lib/utils";
import type { Genre } from "@/lib/constants";
import type { NovelCardData } from "@/types";

const statusLabel: Record<NovelCardData["status"], string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

type LibraryMode = "bookmarked" | "viewed";

const MODE_STORAGE_KEY = "cf-library-mode";

type ViewedItem = {
  slug: string;
  title: string;
  coverUrl?: string;
  chapterNumber: number;
  chapterCount: number;
};

function bookmarkResumeHref(
  novel: NovelCardData,
  progress: ReadingProgressMap,
): string {
  const entry = progress[novel.slug];
  if (entry && novel.chapterCount >= 1) {
    return chapterPublicHref(
      novel,
      Math.min(entry.chapterNumber, novel.chapterCount),
    );
  }
  return novelPublicHref(novel);
}

function LibraryRow({
  slug,
  title,
  coverUrl,
  genres = [],
  href,
  meta,
  onRemove,
  removing,
  removeLabel,
}: {
  slug: string;
  title: string;
  coverUrl?: string;
  genres?: Genre[];
  href: string;
  meta: string;
  onRemove: () => void;
  removing: boolean;
  removeLabel: string;
}) {
  return (
    <li className="group flex items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-2.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent sm:gap-3"
      >
        <NovelCover
          title={title}
          slug={slug}
          coverUrl={coverUrl}
          genres={genres}
          sizes={COVER_SIZES_ROW}
          className="w-10 shrink-0 sm:w-11"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted">{meta}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={removeLabel}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-rose-400"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
}

function bookmarkMeta(novel: NovelCardData, progress: ReadingProgressMap): string {
  const entry = progress[novel.slug];
  const cardGenres = genresExcludingCoverBadges(novel.genres);
  const parts: string[] = [];
  if (entry && novel.chapterCount >= 1) {
    parts.push(`Ch. ${Math.min(entry.chapterNumber, novel.chapterCount)}`);
  }
  parts.push(statusLabel[novel.status]);
  if (cardGenres[0]) parts.push(cardGenres[0]);
  return parts.join(" · ");
}

function resolveViewedItems(progress: ReadingProgressEntry[]): ViewedItem[] {
  const items: ViewedItem[] = [];

  for (const entry of progress) {
    if (!entry.title || !entry.chapterCount || entry.chapterCount < 1) continue;
    items.push({
      slug: entry.slug,
      title: entry.title,
      coverUrl: entry.coverUrl,
      chapterCount: entry.chapterCount,
      chapterNumber: Math.min(entry.chapterNumber, entry.chapterCount),
    });
  }

  return items;
}

export function LibraryGrid({
  bookmarked = [],
  loggedIn = false,
}: {
  bookmarked?: NovelCardData[];
  loggedIn?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<LibraryMode>("bookmarked");
  const [items, setItems] = useState(bookmarked);
  const [viewed, setViewed] = useState<ViewedItem[]>([]);
  const [progress, setProgress] = useState<ReadingProgressMap>({});
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const baseId = useId();
  const orderIndex = useMemo(
    () => new Map(bookmarked.map((novel, index) => [novel.slug, index])),
    [bookmarked],
  );

  useEffect(() => {
    setItems(bookmarked);
  }, [bookmarked]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MODE_STORAGE_KEY);
      if (raw === "bookmarked" || raw === "viewed") setMode(raw);
    } catch {
      // private mode / blocked storage
    }
  }, []);

  useEffect(() => {
    function syncProgress() {
      setProgress(readReadingProgress());
      setViewed(resolveViewedItems(listReadingProgress()));
    }

    syncProgress();
    window.addEventListener("storage", syncProgress);
    window.addEventListener("cf-reading-progress", syncProgress);
    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener("cf-reading-progress", syncProgress);
    };
  }, []);

  function selectMode(next: LibraryMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // private mode / blocked storage
    }
  }

  function insertNovel(current: NovelCardData[], novel: NovelCardData): NovelCardData[] {
    const target = orderIndex.get(novel.slug) ?? current.length;
    const next = [...current];
    const insertAt = next.findIndex(
      (item) => (orderIndex.get(item.slug) ?? Number.MAX_SAFE_INTEGER) > target,
    );
    next.splice(insertAt === -1 ? next.length : insertAt, 0, novel);
    return next;
  }

  function handleRemoveBookmark(novel: NovelCardData) {
    const { slug, title } = novel;
    setRemovingSlug(slug);
    setItems((current) => current.filter((item) => item.slug !== slug));

    startTransition(async () => {
      const result = await removeBookmarks([slug]);
      setRemovingSlug(null);

      if (result.error) {
        setItems((current) => insertNovel(current, novel));
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast(`Removed "${title}"`, {
        action: {
          label: "Undo",
          onClick: () => {
            setItems((current) => insertNovel(current, novel));
            startTransition(async () => {
              const undo = await toggleBookmark(slug);
              if (undo.error) {
                setItems((current) =>
                  current.filter((item) => item.slug !== slug),
                );
                toast.error(undo.error);
                return;
              }
              router.refresh();
            });
          },
        },
      });
    });
  }

  function handleRemoveViewed(item: ViewedItem) {
    const { slug, title, coverUrl, chapterNumber, chapterCount } = item;
    setRemovingSlug(slug);
    setViewed((current) => current.filter((entry) => entry.slug !== slug));
    clearReadingProgress(slug);
    setRemovingSlug(null);
    toast(`Cleared "${title}"`, {
      action: {
        label: "Undo",
        onClick: () => {
          recordReadingProgress(slug, chapterNumber, {
            title,
            coverUrl,
            chapterCount,
          });
          setViewed(resolveViewedItems(listReadingProgress()));
        },
      },
    });
  }

  const activeCount = mode === "bookmarked" ? items.length : viewed.length;

  return (
    <div>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          My library
        </h1>
        {activeCount > 0 ? (
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {activeCount} novel{activeCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </header>

      <div
        role="tablist"
        aria-label="Library view"
        className="mb-3 grid grid-cols-2 gap-0.5 rounded-xl border border-border bg-surface p-0.5"
      >
        {(
          [
            { id: "bookmarked", label: "Bookmarked" },
            { id: "viewed", label: "Viewed" },
          ] as const
        ).map(({ id, label }) => {
          const selected = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${baseId}-${id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectMode(id)}
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm",
                selected
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-bookmarked-panel`}
        aria-labelledby={`${baseId}-bookmarked`}
        hidden={mode !== "bookmarked"}
      >
        {!loggedIn ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Sign in to build your library
            </p>
            <p className="mt-1 text-sm text-muted">
              Bookmark novels and pick up where you left off.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : items.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {items.map((novel) => (
              <LibraryRow
                key={novel.id}
                slug={novel.slug}
                title={novel.title}
                coverUrl={novel.coverUrl}
                genres={novel.genres}
                href={bookmarkResumeHref(novel, progress)}
                meta={bookmarkMeta(novel, progress)}
                onRemove={() => handleRemoveBookmark(novel)}
                removing={pending && removingSlug === novel.slug}
                removeLabel={`Remove ${novel.title} from library`}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
            <p className="text-sm text-muted">Your library is empty.</p>
            <Link
              href="/novels"
              className="mt-2 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Browse novels
            </Link>
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-viewed-panel`}
        aria-labelledby={`${baseId}-viewed`}
        hidden={mode !== "viewed"}
      >
        {viewed.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {viewed.map((item) => (
              <LibraryRow
                key={item.slug}
                slug={item.slug}
                title={item.title}
                coverUrl={item.coverUrl}
                href={chapterPublicHref({ slug: item.slug }, item.chapterNumber)}
                meta={`Ch. ${item.chapterNumber}`}
                onRemove={() => handleRemoveViewed(item)}
                removing={removingSlug === item.slug}
                removeLabel={`Clear ${item.title} from viewed`}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
            <p className="text-sm text-muted">No recently viewed novels.</p>
            <Link
              href="/novels"
              className="mt-2 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Browse novels
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
