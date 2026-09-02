"use client";

import { useEffect } from "react";

import { recordReadingProgress } from "@/lib/reading-progress";

/** Records the current chapter so the homepage Continue Reading section can resume it. */
export function ReadingProgressTracker({
  slug,
  chapterNumber,
  title,
  coverUrl,
  chapterCount,
}: {
  slug: string;
  chapterNumber: number;
  title: string;
  coverUrl?: string;
  chapterCount: number;
}) {
  useEffect(() => {
    recordReadingProgress(slug, chapterNumber, {
      title,
      coverUrl,
      chapterCount,
    });
  }, [slug, chapterNumber, title, coverUrl, chapterCount]);

  return null;
}
