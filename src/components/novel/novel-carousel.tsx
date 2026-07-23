"use client";

import type { Novel } from "@/types";
import { NovelCard } from "./novel-card";
import { NovelGrid } from "./novel-grid";

export function NovelCarousel({
  novels,
  compact = false,
  dense = false,
  fillRow = false,
  hideAuthor = false,
  showChapterCount = false,
}: {
  novels: Novel[];
  compact?: boolean;
  dense?: boolean;
  /** On desktop, show only as many cards as fit one row. */
  fillRow?: boolean;
  hideAuthor?: boolean;
  showChapterCount?: boolean;
}) {
  if (novels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        No novels found.
      </p>
    );
  }

  return (
    <>
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] sm:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Novels"
      >
        {novels.map((novel) => (
          <div
            key={novel.id}
            className={
              dense
                ? "w-[7.5rem] shrink-0 snap-start"
                : "w-[10.5rem] shrink-0 snap-start"
            }
          >
            <NovelCard
              novel={novel}
              compact={compact || dense}
              dense={dense}
              hideAuthor={hideAuthor}
              showChapterCount={showChapterCount}
            />
          </div>
        ))}
      </div>

      <div className="hidden sm:block">
        <NovelGrid
          novels={novels}
          compact={compact}
          dense={dense}
          fillRow={fillRow}
          hideAuthor={hideAuthor}
          showChapterCount={showChapterCount}
        />
      </div>
    </>
  );
}
