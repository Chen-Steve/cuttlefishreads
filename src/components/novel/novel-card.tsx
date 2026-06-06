import Link from "next/link";
import type { Novel } from "@/types";
import { Badge } from "@/components/ui/badge";
import { NovelCover } from "./novel-cover";

const statusLabel: Record<Novel["status"], string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

export function NovelCard({
  novel,
  compact = false,
  hideAuthor = false,
}: {
  novel: Novel;
  /** Title and genres only — hides author and status. */
  compact?: boolean;
  /** Hides the author/translator line while keeping status and genres. */
  hideAuthor?: boolean;
}) {
  return (
    <Link
      href={`/novels/${novel.slug}`}
      className="group flex flex-col gap-3 rounded-xl p-2 outline-offset-2 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
    >
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
        {!compact && !hideAuthor ? (
          <p className="text-xs text-muted">{novel.author}</p>
        ) : null}
        {novel.genres.length > 0 || !compact ? (
          <div className="mt-1 -mx-1 min-w-0 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full flex-nowrap items-center gap-1.5">
              {!compact ? (
                <Badge className="shrink-0 border-accent/30 text-accent">
                  {statusLabel[novel.status]}
                </Badge>
              ) : null}
              {novel.genres.slice(0, 2).map((genre) => (
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
