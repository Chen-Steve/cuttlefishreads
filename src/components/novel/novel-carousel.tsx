"use client";

import type { Novel } from "@/types";
import { NovelCard } from "./novel-card";
import { NovelGrid } from "./novel-grid";

export function NovelCarousel({
  novels,
  compact = false,
  hideAuthor = false,
}: {
  novels: Novel[];
  compact?: boolean;
  hideAuthor?: boolean;
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
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] sm:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Novels"
      >
        {novels.map((novel) => (
          <div key={novel.id} className="w-[10.5rem] shrink-0 snap-start">
            <NovelCard novel={novel} compact={compact} hideAuthor={hideAuthor} />
          </div>
        ))}
      </div>

      <div className="hidden sm:block">
        <NovelGrid novels={novels} compact={compact} hideAuthor={hideAuthor} />
      </div>
    </>
  );
}
