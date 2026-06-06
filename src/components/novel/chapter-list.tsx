import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { isScheduledUnlock } from "@/lib/unlock-countdown";
import type { Chapter } from "@/types";
import { ChapterLockBadge } from "./chapter-lock-badge";

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
                {chapter.title || `Chapter ${chapter.number}`}
              </span>
              {!(chapter.locked && isScheduledUnlock(chapter.unlockAt)) ? (
                <span className="block text-xs text-muted">
                  {chapter.publishedAt}
                </span>
              ) : null}
            </span>
            {chapter.adminAccess ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700">
                <ShieldCheck className="size-3" strokeWidth={2} aria-hidden />
                Admin access
              </span>
            ) : chapter.locked ? (
              <ChapterLockBadge chapter={chapter} />
            ) : null}
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
