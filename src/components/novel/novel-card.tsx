import Link from "next/link";
import type { Novel } from "@/types";
import { Badge } from "@/components/ui/badge";
import { NovelCover } from "./novel-cover";

const statusLabel: Record<Novel["status"], string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
};

export function NovelCard({ novel }: { novel: Novel }) {
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
      <div className="flex flex-col gap-1.5 px-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {novel.title}
        </h3>
        <p className="text-xs text-muted">{novel.author}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge className="border-accent/30 text-accent">
            {statusLabel[novel.status]}
          </Badge>
          {novel.genres.slice(0, 1).map((genre) => (
            <Badge key={genre}>{genre}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
