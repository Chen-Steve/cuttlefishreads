import Link from "next/link";
import { Lock, MessagesSquare } from "lucide-react";

import { forumCategoryUrl, forumThreadUrl } from "@/lib/forum/constants";
import type {
  ForumCategoryGroup,
  ForumCategoryOverview,
} from "@/lib/forum/types";
import { formatRelativeDate } from "@/lib/utils";

function countLabel(count: number, noun: string) {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

function CategoryRow({ category }: { category: ForumCategoryOverview }) {
  return (
    <li>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={forumCategoryUrl(category.slug)}
              className="truncate text-base font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {category.name}
            </Link>
            {category.adminOnlyThreads ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium text-muted"
                title="Only moderators can start threads here"
              >
                <Lock className="size-3" strokeWidth={2} aria-hidden />
                Moderators
              </span>
            ) : null}
          </div>
          {category.description ? (
            <p className="mt-1 text-sm text-muted">{category.description}</p>
          ) : null}
        </div>

        <div className="shrink-0 text-sm text-muted tabular-nums sm:w-32 sm:text-right">
          <p>{countLabel(category.threadCount, "thread")}</p>
          <p className="mt-0.5">{countLabel(category.replyCount, "reply")}</p>
        </div>

        {category.latestThreadId && category.latestThreadTitle ? (
          <div className="min-w-0 shrink-0 text-sm sm:w-52">
            <Link
              href={forumThreadUrl(category.latestThreadId)}
              className="block truncate font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {category.latestThreadTitle}
            </Link>
            {category.lastPostAt ? (
              <p className="mt-0.5 text-xs text-muted">
                {formatRelativeDate(category.lastPostAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function ForumCategoryList({
  groups,
}: {
  groups: ForumCategoryGroup[];
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
        <MessagesSquare
          className="mx-auto size-8 text-muted"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted">
          No categories yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const isPrimary = group.slug === "site";

        return (
          <section key={group.id} aria-labelledby={`section-${group.id}`}>
            <h2
              id={`section-${group.id}`}
              className={
                isPrimary
                  ? "mb-2.5 text-lg font-bold tracking-tight text-foreground sm:text-xl"
                  : "mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted"
              }
            >
              {group.name}
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {group.categories.map((category) => (
                <CategoryRow key={category.id} category={category} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
