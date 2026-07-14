import type { Novel } from "@/types";
import { NovelCard } from "./novel-card";

export function NovelGrid({
  novels,
  compact = false,
  dense = false,
  hideAuthor = false,
  tightMobile = false,
  tightGap = false,
  showChapterCount = false,
}: {
  novels: Novel[];
  compact?: boolean;
  /** More columns and smaller cards (implies compact card chrome). */
  dense?: boolean;
  hideAuthor?: boolean;
  /** Tighter row gap on small screens (compact grids only). */
  tightMobile?: boolean;
  /** Tighter grid gaps without compact card styling. */
  tightGap?: boolean;
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
    <div
      className={
        dense
          ? "grid grid-cols-3 gap-x-2 gap-y-2.5 sm:grid-cols-4 sm:gap-x-2.5 sm:gap-y-3 lg:grid-cols-6 xl:grid-cols-7"
          : compact
            ? tightMobile
              ? "grid grid-cols-2 gap-x-2.5 gap-y-2.5 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-4 xl:grid-cols-5"
              : "grid grid-cols-2 gap-x-2.5 gap-y-4 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-4 xl:grid-cols-5"
            : tightGap
              ? "grid grid-cols-2 gap-x-2 gap-y-2.5 sm:grid-cols-3 sm:gap-x-2.5 sm:gap-y-3.5 lg:grid-cols-4 lg:gap-x-3 lg:gap-y-4 xl:grid-cols-5"
              : "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5"
      }
    >
      {novels.map((novel) => (
        <NovelCard
          key={novel.id}
          novel={novel}
          compact={compact || dense}
          dense={dense}
          hideAuthor={hideAuthor}
          showChapterCount={showChapterCount}
        />
      ))}
    </div>
  );
}
