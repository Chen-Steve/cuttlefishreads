"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RecentlyUpdatedNovel } from "@/types";
import { RecentlyUpdatedList } from "./recently-updated-list";

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

  return (
    <div>
      <RecentlyUpdatedList novels={pageNovels} />

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
              safePage > 0 && "hover:border-accent hover:text-accent",
            )}
          >
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
            Previous
          </button>

          <p className="text-sm tabular-nums text-muted">
            {safePage + 1} / {totalPages}
          </p>

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages - 1, current + 1))
            }
            disabled={safePage >= totalPages - 1}
            aria-label="Next page"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
              safePage < totalPages - 1 && "hover:border-accent hover:text-accent",
            )}
          >
            Next
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
