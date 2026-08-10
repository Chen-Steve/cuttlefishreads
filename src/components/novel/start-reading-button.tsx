"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import {
  type CatalogBase,
  chapterHref,
} from "@/lib/catalog-paths";
import { readReadingProgress } from "@/lib/reading-progress";

const btnClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function StartReadingButton({
  slug,
  firstChapterNumber,
  chapterCount,
  catalogBase = "novels",
}: {
  slug: string;
  firstChapterNumber: number;
  chapterCount: number;
  catalogBase?: CatalogBase;
}) {
  const [resumeAt, setResumeAt] = useState<number | null>(null);

  useEffect(() => {
    function sync() {
      if (chapterCount < 1) {
        setResumeAt(null);
        return;
      }
      const entry = readReadingProgress()[slug];
      if (!entry) {
        setResumeAt(null);
        return;
      }
      setResumeAt(Math.min(entry.chapterNumber, chapterCount));
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cf-reading-progress", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cf-reading-progress", sync);
    };
  }, [slug, chapterCount]);

  const chapterNumber = resumeAt ?? firstChapterNumber;
  const continuing = resumeAt != null;

  return (
    <Link
      href={chapterHref(slug, chapterNumber, catalogBase)}
      className={btnClass}
    >
      <BookOpen className="size-4" strokeWidth={1.75} aria-hidden />
      {continuing ? `Continue ch. ${chapterNumber}` : "Start reading"}
    </Link>
  );
}
