import Link from "next/link";
import { BookOpen } from "lucide-react";

import { chapterHref } from "@/lib/catalog-paths";

const btnClass =
  "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-full sm:flex-none";

export function StartReadingButton({
  slug,
  firstChapterNumber,
}: {
  slug: string;
  firstChapterNumber: number;
}) {
  return (
    <Link
      href={chapterHref(slug, firstChapterNumber)}
      className={btnClass}
    >
      <BookOpen className="size-4" strokeWidth={1.75} aria-hidden />
      Start reading
    </Link>
  );
}
