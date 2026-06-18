import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { RecentlyUpdatedNovel } from "@/types";

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
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {novels.map((novel) => (
        <li key={novel.slug}>
          <Link
            href={`/novels/${novel.slug}/${novel.latestChapter.number}`}
            className="group flex items-center gap-3 px-4 py-2.5 outline-offset-2 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-accent sm:gap-4 sm:py-3"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {novel.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                Ch. {novel.latestChapter.number}
                {novel.latestChapter.title
                  ? ` · ${novel.latestChapter.title}`
                  : ""}
              </span>
            </div>
            <time
              dateTime={novel.updatedAt}
              className="shrink-0 text-xs text-muted"
            >
              {novel.updatedAtLabel}
            </time>
            <ChevronRight
              className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
