import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Chapter, ChapterSummary } from "@/types";
import { type CatalogBase, chapterHref } from "@/lib/catalog-paths";
import { cn } from "@/lib/utils";
import { ChapterContentsDropdown } from "./chapter-contents-dropdown";
import { ReaderSettingsPanel } from "./reader-settings-panel";
import { readerChromeIconBtnClass } from "./reader-chrome";

export function ReaderNav({
  slug,
  previous,
  next,
  chapters,
  currentChapter,
  menuPlacement = "down",
  showSettings = false,
  catalogBase = "novels",
}: {
  slug: string;
  previous?: Pick<Chapter, "number">;
  next?: Pick<Chapter, "number">;
  chapters: ChapterSummary[];
  currentChapter: number;
  menuPlacement?: "up" | "down";
  showSettings?: boolean;
  catalogBase?: CatalogBase;
}) {
  return (
    <nav
      aria-label="Chapter navigation"
      className="mx-auto flex w-full max-w-md items-center gap-0.5 rounded-2xl border border-border/80 bg-surface/90 p-1 shadow-sm"
    >
      <ReaderLink
        href={
          previous
            ? chapterHref(slug, previous.number, catalogBase)
            : undefined
        }
        icon={<ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />}
        label="Previous chapter"
      />

      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
        <ChapterContentsDropdown
          slug={slug}
          chapters={chapters}
          currentChapter={currentChapter}
          placement={menuPlacement}
          catalogBase={catalogBase}
        />
        {showSettings ? (
          <ReaderSettingsPanel placement={menuPlacement} />
        ) : null}
      </div>

      <ReaderLink
        href={next ? chapterHref(slug, next.number, catalogBase) : undefined}
        icon={<ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />}
        label="Next chapter"
      />
    </nav>
  );
}

function ReaderLink({
  href,
  icon,
  label,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
}) {
  const classes = cn(
    readerChromeIconBtnClass,
    !href && "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-muted",
  );

  const content = (
    <>
      {icon}
      <span className="sr-only">{label}</span>
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
    <Link href={href} className={classes} title={label}>
      {content}
    </Link>
  );
}
