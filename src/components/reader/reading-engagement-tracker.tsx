"use client";

import { useEffect, useRef } from "react";

import {
  recordNovelView,
  reportChapterEngagement,
} from "@/app/(main)/novels/actions";
import {
  READER_MIN_ACTIVE_SECONDS,
  READER_MIN_SCROLL_PCT,
} from "@/lib/reading-engagement";

const REPORT_INTERVAL_MS = 10_000;

function scrollPercent(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
}

/**
 * In-house engagement for Originals only:
 * - Counts a View once per chapter load (session-deduped).
 * - For logged-in readers: tracks active time (visible tab only) and scroll
 *   depth; reports progress and qualifies a unique Reader at 30s or 50% scroll.
 */
export function ReadingEngagementTracker({
  slug,
  chapterNumber,
  isLoggedIn,
}: {
  slug: string;
  chapterNumber: number;
  isLoggedIn: boolean;
}) {
  const activeSecondsRef = useRef(0);
  const maxScrollRef = useRef(0);
  const qualifiedRef = useRef(false);
  const visibleRef = useRef(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  // Record a chapter view once per tab session for this chapter.
  useEffect(() => {
    const key = `cf-view:${slug}:${chapterNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable — still record once for this mount.
    }
    void recordNovelView(slug);
  }, [slug, chapterNumber]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const tick = () => {
      if (!visibleRef.current || qualifiedRef.current) return;
      activeSecondsRef.current += 1;
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercent());
    };

    const onScroll = () => {
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercent());
    };

    const onVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
    };

    const report = () => {
      if (qualifiedRef.current) return;
      const active = activeSecondsRef.current;
      const scroll = maxScrollRef.current;
      if (active < 5 && scroll < 10) return;

      void reportChapterEngagement(slug, chapterNumber, active, scroll).then(
        (result) => {
          if (
            result.newlyQualified ||
            active >= READER_MIN_ACTIVE_SECONDS ||
            scroll >= READER_MIN_SCROLL_PCT
          ) {
            // Stop reporting after qualification thresholds are met client-side;
            // server may have already counted the reader.
            if (
              active >= READER_MIN_ACTIVE_SECONDS ||
              scroll >= READER_MIN_SCROLL_PCT
            ) {
              qualifiedRef.current = true;
            }
          }
        },
      );
    };

    const secondTimer = window.setInterval(tick, 1000);
    const reportTimer = window.setInterval(report, REPORT_INTERVAL_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    // Initial scroll sample + delayed first report.
    onScroll();
    const firstReport = window.setTimeout(report, 5_000);

    return () => {
      window.clearInterval(secondTimer);
      window.clearInterval(reportTimer);
      window.clearTimeout(firstReport);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      // Final flush on leave.
      if (!qualifiedRef.current) {
        void reportChapterEngagement(
          slug,
          chapterNumber,
          activeSecondsRef.current,
          maxScrollRef.current,
        );
      }
    };
  }, [slug, chapterNumber, isLoggedIn]);

  return null;
}
