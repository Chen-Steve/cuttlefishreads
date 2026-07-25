import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const linkClass =
  "inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent";

export function ForumPagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      className="flex items-center justify-between gap-3 pt-2"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={linkClass} rel="prev">
          <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
          Previous
        </Link>
      ) : (
        <span />
      )}

      <p className="text-sm text-muted tabular-nums">
        Page {page} of {pageCount}
      </p>

      {page < pageCount ? (
        <Link href={buildHref(page + 1)} className={linkClass} rel="next">
          Next
          <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
