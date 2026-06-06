import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Chapter, ChapterSummary } from "@/types";
import { cn } from "@/lib/utils";
import { ChapterContentsDropdown } from "./chapter-contents-dropdown";

export function ReaderNav({
  slug,
  previous,
  next,
  chapters,
  currentChapter,
  menuPlacement = "down",
}: {
  slug: string;
  previous?: Chapter;
  next?: Chapter;
  chapters: ChapterSummary[];
  currentChapter: number;
  menuPlacement?: "up" | "down";
}) {
  return (
    <nav
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3"
      aria-label="Chapter navigation"
    >
      <div className="justify-self-start">
        <ReaderLink
          href={previous ? `/novels/${slug}/${previous.number}` : undefined}
          icon={<ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />}
          label="Previous"
        />
      </div>
      <div className="justify-self-center">
        <ChapterContentsDropdown
          slug={slug}
          chapters={chapters}
          currentChapter={currentChapter}
          placement={menuPlacement}
        />
      </div>
      <div className="justify-self-end">
        <ReaderLink
          href={next ? `/novels/${slug}/${next.number}` : undefined}
          icon={<ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />}
          label="Next"
          trailing
        />
      </div>
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
    "inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium leading-none transition-colors",
    href
      ? "text-foreground hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      : "cursor-not-allowed text-muted/50",
  );

  const content = (
    <>
      {!trailing && icon}
      <span className="sr-only">{label}</span>
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
