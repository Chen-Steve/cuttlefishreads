import Link from "next/link";
import { ArrowLeft, ArrowRight, List } from "lucide-react";
import type { Chapter } from "@/types";
import { cn } from "@/lib/utils";

export function ReaderNav({
  slug,
  previous,
  next,
}: {
  slug: string;
  previous?: Chapter;
  next?: Chapter;
}) {
  return (
    <nav className="flex items-center justify-between gap-2 sm:gap-3" aria-label="Chapter navigation">
      <ReaderLink
        href={previous ? `/novels/${slug}/${previous.number}` : undefined}
        icon={<ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />}
        label="Previous"
      />
      <Link
        href={`/novels/${slug}`}
        className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <List className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Contents</span>
      </Link>
      <ReaderLink
        href={next ? `/novels/${slug}/${next.number}` : undefined}
        icon={<ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />}
        label="Next"
        trailing
      />
    </nav>
  );
}

function ReaderLink({
  href,
  icon,
  label,
  trailing = false,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  trailing?: boolean;
}) {
  const classes = cn(
    "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium leading-none transition-colors sm:px-4",
    href
      ? "text-foreground hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      : "cursor-not-allowed text-muted/50",
  );

  const content = (
    <>
      {!trailing && icon}
      <span>{label}</span>
      {trailing && icon}
    </>
  );

  if (!href) {
    return (
      <span className={classes} aria-disabled>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
