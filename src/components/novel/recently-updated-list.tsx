import type { ReactNode } from "react";
import Link from "next/link";

import { TabPanelShell } from "@/components/tab-panel-shell";
import { NovelCover, COVER_SIZES_RECENT } from "./novel-cover";
import type { RecentlyUpdatedNovel } from "@/types";
import {
  type CatalogBase,
  chapterHref,
  novelHref,
} from "@/lib/catalog-paths";
import { cn } from "@/lib/utils";

function truncateLabel(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}…`;
}

export function RecentlyUpdatedCard({
  novel,
  catalogBase = "novels",
  framed = true,
}: {
  novel: RecentlyUpdatedNovel;
  catalogBase?: CatalogBase;
  framed?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex gap-3.5 p-2.5 sm:gap-4 sm:p-3",
        framed && "rounded-xl border border-border bg-surface",
      )}
    >
      <Link
        href={novelHref(novel.slug, catalogBase)}
        aria-label={novel.title}
        className="group/cover shrink-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <NovelCover
          title={novel.title}
          slug={novel.slug}
          coverUrl={novel.coverUrl}
          sizes={COVER_SIZES_RECENT}
          className="w-24 transition-transform duration-300 group-hover/cover:-translate-y-0.5 sm:w-28"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link
          href={novelHref(novel.slug, catalogBase)}
          className="outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-accent sm:text-base">
            {novel.title}
          </h3>
        </Link>

        <time dateTime={novel.updatedAt} className="text-xs text-muted">
          {novel.updatedAtLabel}
        </time>

        <ul className="flex flex-col gap-1">
          {novel.recentChapters.slice(0, 3).map((chapter) => (
            <li key={chapter.number}>
              <Link
                href={chapterHref(novel.slug, chapter.number, catalogBase)}
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
  );
}

export function RecentlyUpdatedList({
  novels,
  catalogBase = "novels",
  firstCardHeader,
  firstCardRightTab,
  lastCardFooter,
}: {
  novels: RecentlyUpdatedNovel[];
  catalogBase?: CatalogBase;
  firstCardHeader?: ReactNode;
  firstCardRightTab?: ReactNode;
  lastCardFooter?: ReactNode;
}) {
  if (novels.length === 0) {
    if (firstCardHeader) {
      return (
        <TabPanelShell leftTab={firstCardHeader} rightTab={firstCardRightTab}>
          <p className="px-4 py-12 text-center text-sm text-muted">
            No recent updates yet.
          </p>
        </TabPanelShell>
      );
    }
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        No recent updates yet.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3",
        firstCardHeader ? "pt-9" : undefined,
      )}
    >
      {novels.map((novel, index) => {
        const isFirst = Boolean(firstCardHeader) && index === 0;
        const isLast =
          Boolean(lastCardFooter) && index === novels.length - 1;

        if (!isFirst && !isLast) {
          return (
            <RecentlyUpdatedCard
              key={novel.slug}
              novel={novel}
              catalogBase={catalogBase}
            />
          );
        }

        return (
          <TabPanelShell
            key={novel.slug}
            className={cn("min-w-0", isFirst && "-mt-9")}
            leftTab={isFirst ? firstCardHeader : undefined}
            rightTab={isFirst ? firstCardRightTab : undefined}
            bottomCenterTab={isLast ? lastCardFooter : undefined}
          >
            <RecentlyUpdatedCard
              novel={novel}
              catalogBase={catalogBase}
              framed={false}
            />
          </TabPanelShell>
        );
      })}
    </div>
  );
}
