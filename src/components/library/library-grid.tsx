"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";

import { removeBookmarks, toggleBookmark } from "@/app/(main)/novels/actions";
import { genresExcludingCoverBadges, NovelCover } from "@/components/novel/novel-cover";
import type { Novel } from "@/types";

const statusLabel: Record<Novel["status"], string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

function LibraryRow({
  novel,
  onRemove,
  removing,
}: {
  novel: Novel;
  onRemove: (novel: Novel) => void;
  removing: boolean;
}) {
  const cardGenres = genresExcludingCoverBadges(novel.genres);

  return (
    <li className="group flex items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3">
      <Link
        href={`/novels/${novel.slug}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent sm:gap-3"
      >
        <NovelCover
          title={novel.title}
          slug={novel.slug}
          coverUrl={novel.coverUrl}
          genres={novel.genres}
          className="w-10 shrink-0 sm:w-11"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">
            {novel.title}
          </h3>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <span className="shrink-0">{statusLabel[novel.status]}</span>
            {cardGenres[0] ? (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span className="truncate">{cardGenres[0]}</span>
              </>
            ) : null}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onRemove(novel)}
        disabled={removing}
        aria-label={`Remove ${novel.title} from library`}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-rose-400"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
}

export function LibraryGrid({ novels }: { novels: Novel[] }) {
  const router = useRouter();
  const [items, setItems] = useState(novels);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const orderIndex = useMemo(
    () => new Map(novels.map((novel, index) => [novel.slug, index])),
    [novels],
  );

  useEffect(() => {
    setItems(novels);
  }, [novels]);

  function insertNovel(current: Novel[], novel: Novel): Novel[] {
    const target = orderIndex.get(novel.slug) ?? current.length;
    const next = [...current];
    const insertAt = next.findIndex(
      (item) => (orderIndex.get(item.slug) ?? Number.MAX_SAFE_INTEGER) > target,
    );
    next.splice(insertAt === -1 ? next.length : insertAt, 0, novel);
    return next;
  }

  function handleRemove(novel: Novel) {
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
                setItems((current) => current.filter((item) => item.slug !== slug));
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

  return (
    <div>
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          My library
        </h1>
        {items.length > 0 ? (
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {items.length} novel{items.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </header>

      {items.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((novel) => (
            <LibraryRow
              key={novel.id}
              novel={novel}
              onRemove={handleRemove}
              removing={pending && removingSlug === novel.slug}
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
  );
}
