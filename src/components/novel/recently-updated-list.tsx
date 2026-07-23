import Link from "next/link";

import { NovelCover } from "./novel-cover";
import type { RecentlyUpdatedNovel } from "@/types";

function truncateLabel(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}…`;
}

export function RecentlyUpdatedList({
  novels,
}: {
  novels: RecentlyUpdatedNovel[];
}) {
  if (novels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        No recent updates yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {novels.map((novel) => (
        <article
          key={novel.slug}
          className="flex gap-3.5 rounded-xl border border-border bg-surface p-2.5 sm:gap-4 sm:p-3"
        >
          <Link
            href={`/novels/${novel.slug}`}
            aria-label={novel.title}
            className="group/cover shrink-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <NovelCover
              title={novel.title}
              slug={novel.slug}
              coverUrl={novel.coverUrl}
              className="w-24 transition-transform duration-300 group-hover/cover:-translate-y-0.5 sm:w-28"
            />
          </Link>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Link
              href={`/novels/${novel.slug}`}
              className="outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-accent sm:text-base">
                {novel.title}
              </h3>
            </Link>

            <time
              dateTime={novel.updatedAt}
              className="text-xs text-muted"
            >
              {novel.updatedAtLabel}
            </time>

            <ul className="flex flex-col gap-1">
              {novel.recentChapters.slice(0, 2).map((chapter) => (
                <li key={chapter.number}>
                  <Link
                    href={`/novels/${novel.slug}/${chapter.number}`}
                    className="group/chapter block truncate text-xs text-muted outline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent sm:text-sm"
                  >
                    <span className="font-medium text-foreground/80 group-hover/chapter:text-accent">
                      Ch. {chapter.number}
                    </span>
                    {chapter.title ? (
                      <span className="text-muted group-hover/chapter:text-accent/80">
                        {" · "}
                        {truncateLabel(chapter.title, 28)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}
