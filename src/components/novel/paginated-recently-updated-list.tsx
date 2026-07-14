"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RecentlyUpdatedNovel } from "@/types";
import { RecentlyUpdatedList } from "./recently-updated-list";

function buildPageRange(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  const current = currentPage + 1;

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (current >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    current - 1,
    current,
    current + 1,
    "ellipsis",
    totalPages,
  ];
}

export function PaginatedRecentlyUpdatedList({
  novels,
  pageSize = 8,
}: {
  novels: RecentlyUpdatedNovel[];
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(novels.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageNovels = novels.slice(start, start + pageSize);
  const pageItems = buildPageRange(safePage, totalPages);

  return (
    <div>
      <RecentlyUpdatedList novels={pageNovels} />

      {totalPages > 1 ? (
        <nav
          aria-label="Recently updated pagination"
          className="mt-4 flex items-center justify-center gap-1 border-t border-border pt-4"
        >
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
              safePage > 0 && "hover:border-accent hover:text-accent",
            )}
          >
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
          </button>

          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex size-9 items-center justify-center text-sm text-muted"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item - 1)}
                aria-label={`Page ${item}`}
                aria-current={safePage + 1 === item ? "page" : undefined}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  safePage + 1 === item
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-surface hover:text-accent",
                )}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages - 1, current + 1))
            }
            disabled={safePage >= totalPages - 1}
            aria-label="Next page"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
              safePage < totalPages - 1 && "hover:border-accent hover:text-accent",
            )}
          >
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
