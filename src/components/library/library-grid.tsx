"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";

import { removeBookmarks } from "@/app/(main)/novels/actions";
import { NovelGrid } from "@/components/novel";
import { Badge } from "@/components/ui/badge";
import { NovelCover } from "@/components/novel/novel-cover";
import type { Novel } from "@/types";

const statusLabel: Record<Novel["status"], string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

function SelectableNovelCard({
  novel,
  selected,
  onToggle,
}: {
  novel: Novel;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group relative flex flex-col gap-3 rounded-xl p-2 text-left outline-offset-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent ${
        selected ? "bg-surface ring-2 ring-accent" : ""
      }`}
    >
      <span
        className={`absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-md border transition-colors ${
          selected
            ? "border-accent bg-accent text-white"
            : "border-border bg-background/90 text-transparent group-hover:border-accent/50"
        }`}
        aria-hidden
      >
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
      <NovelCover
        title={novel.title}
        slug={novel.slug}
        coverUrl={novel.coverUrl}
        className="transition-transform duration-300 group-hover:-translate-y-0.5"
      />
      <div className="flex min-w-0 flex-col gap-1.5 px-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {novel.title}
        </h3>
        {novel.genres.length > 0 ? (
          <div className="mt-1 -mx-1 min-w-0 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full flex-nowrap items-center gap-1.5">
              <Badge className="shrink-0 border-accent/30 text-accent">
                {statusLabel[novel.status]}
              </Badge>
              {novel.genres.slice(0, 2).map((genre) => (
                <Badge key={genre} className="shrink-0">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <Badge className="w-fit border-accent/30 text-accent">
            {statusLabel[novel.status]}
          </Badge>
        )}
      </div>
    </button>
  );
}

export function LibraryGrid({ novels }: { novels: Novel[] }) {
  const router = useRouter();
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSlugs = useMemo(() => novels.map((novel) => novel.slug), [novels]);
  const selectedCount = selected.size;
  const allSelected = novels.length > 0 && selectedCount === novels.length;

  function toggleSlug(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function exitManaging() {
    setManaging(false);
    setSelected(new Set());
    setConfirming(false);
    setError(null);
  }

  function handleRemove() {
    const slugs = [...selected];
    startTransition(async () => {
      const result = await removeBookmarks(slugs);
      if (result.error) {
        setError(result.error);
        return;
      }
      exitManaging();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {managing ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => (allSelected ? setSelected(new Set()) : setSelected(new Set(allSlugs)))}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <span className="text-sm text-muted">
                {selectedCount} selected
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirming(true);
                }}
                disabled={selectedCount === 0 || pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-background px-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                Remove selected
              </button>
              <button
                type="button"
                onClick={exitManaging}
                disabled={pending}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setManaging(true)}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40"
          >
            Manage library
          </button>
        )}
      </div>

      {confirming ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="remove-bookmarks-title"
          className="mb-4 rounded-xl border border-border bg-surface p-4"
        >
          <p
            id="remove-bookmarks-title"
            className="text-sm font-semibold text-foreground"
          >
            Remove {selectedCount === novels.length ? "all" : selectedCount}{" "}
            bookmark{selectedCount === 1 ? "" : "s"}?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            These novels will be removed from your library. You can bookmark them
            again later.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Removing…" : "Remove"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={pending}
              className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {managing ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5">
          {novels.map((novel) => (
            <SelectableNovelCard
              key={novel.id}
              novel={novel}
              selected={selected.has(novel.slug)}
              onToggle={() => toggleSlug(novel.slug)}
            />
          ))}
        </div>
      ) : (
        <NovelGrid novels={novels} hideAuthor />
      )}
    </div>
  );
}
