import Link from "next/link";
import type { Novel, NovelRatingSummary } from "@/types";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/reviews";
import {
  type CatalogBase,
  novelHref,
  novelPublicHref,
} from "@/lib/catalog-paths";
import { genresExcludingCoverBadges, NovelCover } from "./novel-cover";

const statusLabel: Record<Novel["status"], string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

export function NovelCard({
  novel,
  compact = false,
  dense = false,
  hideAuthor = false,
  showChapterCount = false,
  /** Cover + title + rating + by username (no status/genres). */
  showRatingMeta = false,
  rating,
  catalogBase,
}: {
  novel: Novel;
  /** Title and genres only — hides author and status. */
  compact?: boolean;
  /** Smaller cover grid cards — title + genres, tighter padding. */
  dense?: boolean;
  /** Hides the author/translator line while keeping status and genres. */
  hideAuthor?: boolean;
  showChapterCount?: boolean;
  showRatingMeta?: boolean;
  rating?: NovelRatingSummary;
  /** Override automatic publication-aware routing. */
  catalogBase?: CatalogBase;
}) {
  const cardGenres = genresExcludingCoverBadges(novel.genres);
  const showMeta =
    !showRatingMeta && (cardGenres.length > 0 || (!dense && !compact));
  const href = catalogBase
    ? novelHref(novel.slug, catalogBase)
    : novelPublicHref(novel);
  const byline =
    novel.translatorUsername?.trim() ||
    novel.translator?.trim() ||
    novel.author;

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl outline-offset-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent ${
        dense ? "gap-1.5 p-0.5" : compact ? "gap-2 p-1" : "gap-3 p-2"
      }`}
    >
      <NovelCover
        title={novel.title}
        slug={novel.slug}
        coverUrl={novel.coverUrl}
        chapterCount={
          showChapterCount && !showRatingMeta ? novel.chapterCount : undefined
        }
        genres={showRatingMeta ? [] : novel.genres}
        className="transition-transform duration-300 group-hover:-translate-y-0.5"
      />
      <div
        className={`flex min-w-0 flex-col ${
          dense ? "gap-0.5 px-0.5" : compact ? "gap-1 px-1" : "gap-1.5 px-1"
        }`}
      >
        <h3
          className={`line-clamp-2 font-semibold leading-snug text-foreground ${
            dense ? "text-xs" : "text-sm"
          }`}
        >
          {novel.title}
        </h3>

        {showRatingMeta ? (
          <>
            {rating && rating.count > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                <StarRating
                  value={rating.average}
                  starClassName="size-3"
                />
                <span className="tabular-nums font-medium text-foreground/80">
                  {rating.average.toFixed(1)}
                </span>
              </span>
            ) : (
              <span className="text-[11px] text-muted">No ratings</span>
            )}
            <p className="truncate text-[11px] text-muted">by {byline}</p>
          </>
        ) : (
          <>
            {!compact && !hideAuthor ? (
              <p className="text-xs text-muted">{novel.author}</p>
            ) : null}
            {showMeta ? (
              <div
                className={`${compact ? "mt-0.5" : "mt-1"} -mx-1 min-w-0 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
              >
                <div className="flex w-max min-w-full flex-nowrap items-center gap-1.5">
                  {!compact ? (
                    <Badge className="shrink-0 border-accent/30 text-accent">
                      {statusLabel[novel.status]}
                    </Badge>
                  ) : null}
                  {cardGenres.slice(0, 2).map((genre) => (
                    <Badge key={genre} className="shrink-0">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Link>
  );
}
