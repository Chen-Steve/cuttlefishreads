import type { NovelCardData, NovelRatingSummary } from "@/types";
import type { CatalogBase } from "@/lib/catalog-paths";
import { cn } from "@/lib/utils";
import { NovelCard } from "./novel-card";

export function NovelCarousel({
  novels,
  compact = false,
  dense = false,
  fillRow = false,
  hideAuthor = false,
  showChapterCount = false,
  showRatingMeta = false,
  ratingsBySlug,
  catalogBase = "novels",
  emptyLabel = "No novels found.",
}: {
  novels: NovelCardData[];
  compact?: boolean;
  dense?: boolean;
  /** On desktop, show only as many cards as fit one row. */
  fillRow?: boolean;
  hideAuthor?: boolean;
  showChapterCount?: boolean;
  showRatingMeta?: boolean;
  ratingsBySlug?: Record<string, NovelRatingSummary>;
  catalogBase?: CatalogBase;
  emptyLabel?: string;
}) {
  if (novels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] sm:snap-none sm:overflow-visible sm:overscroll-auto sm:pb-0 sm:grid [&::-webkit-scrollbar]:hidden",
        dense
          ? "sm:grid-cols-4 sm:gap-x-2.5 sm:gap-y-3 lg:grid-cols-6 xl:grid-cols-7"
          : "sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 lg:grid-cols-4 xl:grid-cols-5",
        fillRow &&
          dense &&
          "sm:max-lg:[&>*:nth-child(n+5)]:hidden lg:max-xl:[&>*:nth-child(n+7)]:hidden xl:[&>*:nth-child(n+8)]:hidden",
        fillRow &&
          !dense &&
          "sm:max-lg:[&>*:nth-child(n+4)]:hidden lg:max-xl:[&>*:nth-child(n+5)]:hidden xl:[&>*:nth-child(n+6)]:hidden",
      )}
      aria-label="Novels"
    >
      {novels.map((novel) => (
        <div
          key={novel.id}
          className={
            dense
              ? "w-[7.5rem] shrink-0 snap-start sm:w-auto sm:min-w-0"
              : "w-[10.5rem] shrink-0 snap-start sm:w-auto sm:min-w-0"
          }
        >
          <NovelCard
            novel={novel}
            compact={compact || dense}
            dense={dense}
            hideAuthor={hideAuthor}
            showChapterCount={showChapterCount}
            showRatingMeta={showRatingMeta}
            rating={ratingsBySlug?.[novel.slug]}
            catalogBase={catalogBase}
          />
        </div>
      ))}
    </div>
  );
}
