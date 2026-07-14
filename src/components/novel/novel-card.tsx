import Link from "next/link";
import type { Novel } from "@/types";
import { Badge } from "@/components/ui/badge";
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
}: {
  novel: Novel;
  /** Title and genres only — hides author and status. */
  compact?: boolean;
  /** Smaller cover grid cards — title only, tighter padding. */
  dense?: boolean;
  /** Hides the author/translator line while keeping status and genres. */
  hideAuthor?: boolean;
  showChapterCount?: boolean;
}) {
  const cardGenres = genresExcludingCoverBadges(novel.genres);
  const showMeta = !dense && (cardGenres.length > 0 || !compact);

  return (
    <Link
      href={`/novels/${novel.slug}`}
      className={`group flex flex-col rounded-xl outline-offset-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent ${
        dense ? "gap-1.5 p-0.5" : compact ? "gap-2 p-1" : "gap-3 p-2"
      }`}
    >
      <NovelCover
        title={novel.title}
        slug={novel.slug}
        coverUrl={novel.coverUrl}
        chapterCount={showChapterCount ? novel.chapterCount : undefined}
        genres={novel.genres}
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
      </div>
    </Link>
  );
}
