import Link from "next/link";

import { type CatalogBase, novelHref } from "@/lib/catalog-paths";

export function ChapterReaderHeader({
  slug,
  novelTitle,
  chapterNumber,
  chapterTitle,
  catalogBase = "novels",
}: {
  slug: string;
  novelTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  catalogBase?: CatalogBase;
}) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-1.5 text-center">
      <Link
        href={novelHref(slug, catalogBase)}
        title={novelTitle}
        className="max-w-full truncate text-[11px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {novelTitle}
      </Link>
      <h1 className="max-w-full text-balance text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {chapterTitle?.trim()
          ? `Chapter ${chapterNumber}: ${chapterTitle.trim()}`
          : `Chapter ${chapterNumber}`}
      </h1>
    </div>
  );
}
