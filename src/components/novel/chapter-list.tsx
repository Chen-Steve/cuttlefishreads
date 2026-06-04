import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Chapter } from "@/types";

export function ChapterList({
  slug,
  chapters,
}: {
  slug: string;
  chapters: Chapter[];
}) {
  if (chapters.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        No chapters published yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {chapters.map((chapter) => (
        <li key={chapter.id}>
          <Link
            href={`/novels/${slug}/${chapter.number}`}
            className="group flex items-center gap-4 px-4 py-3 outline-offset-2 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-accent">
              {chapter.number}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {chapter.title}
              </span>
              <span className="block text-xs text-muted">
                {chapter.publishedAt}
              </span>
            </span>
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
