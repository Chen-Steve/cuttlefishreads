"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { TabPanelShell } from "@/components/tab-panel-shell";
import { useStoredOpen } from "@/hooks/use-stored-open";
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
  /** Caps client payload / pagination depth (e.g. 5 → at most 5 pages). */
  maxPages,
  catalogBase = "novels",
  className = "mt-4 sm:mt-5",
}: {
  novels: RecentlyUpdatedNovel[];
  pageSize?: number;
  maxPages?: number;
  catalogBase?: import("@/lib/catalog-paths").CatalogBase;
  className?: string;
}) {
  const limited =
    maxPages != null && maxPages > 0
      ? novels.slice(0, pageSize * maxPages)
      : novels;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(limited.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageNovels = limited.slice(start, start + pageSize);
  const pageItems = buildPageRange(safePage, totalPages);
  const { open, toggle } = useStoredOpen(
    "cf-home-section-recently-updated",
    true,
  );
  const panelId = useId();

  const titleTab = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={toggle}
      className="inline-flex h-9 items-center gap-1.5 px-4 text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <h2>Recently updated</h2>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted transition-transform",
          open && "rotate-180",
        )}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );

  const pagination =
    totalPages > 1 ? (
      <nav
        aria-label="Recently updated pagination"
        className="flex max-w-full items-center justify-center gap-1 overflow-x-auto px-2"
      >
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={safePage === 0}
          aria-label="Previous page"
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
            safePage > 0 && "hover:text-accent",
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
                "relative inline-flex size-9 items-center justify-center text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                safePage + 1 === item
                  ? "text-accent-foreground"
                  : "text-foreground hover:text-accent",
              )}
            >
              {safePage + 1 === item ? (
                <span
                  className="absolute inset-0 m-auto size-7 rounded-md bg-accent"
                  aria-hidden
                />
              ) : null}
              <span className="relative">{item}</span>
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
            "inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
            safePage < totalPages - 1 && "hover:text-accent",
          )}
        >
          <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </nav>
    ) : null;

  return (
    <section className={className}>
      {open ? (
        <div id={panelId}>
          <RecentlyUpdatedList
            novels={pageNovels}
            catalogBase={catalogBase}
            firstCardHeader={titleTab}
            lastCardFooter={pagination}
          />
        </div>
      ) : (
        <TabPanelShell leftTab={titleTab}>
          <div id={panelId} hidden />
        </TabPanelShell>
      )}
    </section>
  );
}
