import type { Novel } from "@/types";
import { cn } from "@/lib/utils";
import { NovelCard } from "./novel-card";

/** Max cards shown in a dense fill-row grid (matches xl:grid-cols-7). */
export const DENSE_FILL_ROW_LIMIT = 7;

export function NovelGrid({
  novels,
  compact = false,
  dense = false,
  fillRow = false,
  hideAuthor = false,
  tightMobile = false,
  tightGap = false,
  showChapterCount = false,
}: {
  novels: Novel[];
  compact?: boolean;
  /** More columns and smaller cards (implies compact card chrome). */
  dense?: boolean;
  /** Hide overflow cards so one row fills each desktop breakpoint. */
  fillRow?: boolean;
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
      className={cn(
        dense
          ? "grid grid-cols-3 gap-x-2 gap-y-2.5 sm:grid-cols-4 sm:gap-x-2.5 sm:gap-y-3 lg:grid-cols-6 xl:grid-cols-7"
          : compact
            ? tightMobile
              ? "grid grid-cols-2 gap-x-2.5 gap-y-2.5 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-4 xl:grid-cols-5"
              : "grid grid-cols-2 gap-x-2.5 gap-y-4 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-4 xl:grid-cols-5"
            : tightGap
              ? "grid grid-cols-2 gap-x-2 gap-y-2.5 sm:grid-cols-3 sm:gap-x-2.5 sm:gap-y-3.5 lg:grid-cols-4 lg:gap-x-3 lg:gap-y-4 xl:grid-cols-5"
              : "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5",
        fillRow &&
          dense &&
          "sm:max-lg:[&>*:nth-child(n+5)]:hidden lg:max-xl:[&>*:nth-child(n+7)]:hidden xl:[&>*:nth-child(n+8)]:hidden",
        fillRow &&
          !dense &&
          "sm:max-lg:[&>*:nth-child(n+4)]:hidden lg:max-xl:[&>*:nth-child(n+5)]:hidden xl:[&>*:nth-child(n+6)]:hidden",
      )}
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
