"use client";

import { useEffect } from "react";

import { recordReadingProgress } from "@/lib/reading-progress";

/** Records the current chapter so the homepage Continue Reading section can resume it. */
export function ReadingProgressTracker({
  slug,
  chapterNumber,
}: {
  slug: string;
  chapterNumber: number;
}) {
  useEffect(() => {
    recordReadingProgress(slug, chapterNumber);
  }, [slug, chapterNumber]);

  return null;
}
