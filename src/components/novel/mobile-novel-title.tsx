"use client";

import { useEffect, useRef, useState } from "react";

type ScrollLayout = {
  width: number;
  height: number;
};

/**
 * Mobile-only novel title: wraps to at most 2 lines. If the title needs more
 * than 2 lines at full width, the text is laid out in a wider 2-line strip
 * the user can scroll sideways to read.
 */
export function MobileNovelTitle({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [scrollLayout, setScrollLayout] = useState<ScrollLayout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;

      const styles = getComputedStyle(measure);
      const lineHeight = parseFloat(styles.lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

      const maxHeight = lineHeight * 2 + 1;

      measure.style.width = `${containerWidth}px`;
      if (measure.scrollHeight <= maxHeight) {
        setScrollLayout(null);
        measure.style.width = "";
        return;
      }

      let lo = containerWidth;
      let hi = containerWidth;
      while (measure.scrollHeight > maxHeight && hi < containerWidth * 8) {
        hi = Math.ceil(hi * 1.5);
        measure.style.width = `${hi}px`;
      }

      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        measure.style.width = `${mid}px`;
        if (measure.scrollHeight <= maxHeight) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }

      measure.style.width = `${lo}px`;
      const height = measure.scrollHeight;
      measure.style.width = "";
      setScrollLayout({ width: lo, height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => {
      ro.disconnect();
      measure.style.width = "";
    };
  }, [title]);

  const scrolling = scrollLayout != null;

  return (
    <div
      ref={containerRef}
      className={`relative min-w-0 sm:hidden ${
        scrolling
          ? "overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          : ""
      }`}
      style={
        scrolling
          ? { height: scrollLayout.height, maxHeight: scrollLayout.height }
          : undefined
      }
    >
      <p
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 text-xl font-bold leading-snug tracking-tight"
      >
        {title}
      </p>
      <h1
        className={`text-xl font-bold leading-snug tracking-tight text-foreground ${
          scrolling ? "" : "line-clamp-2 text-balance"
        }`}
        style={scrolling ? { width: scrollLayout.width } : undefined}
      >
        {title}
      </h1>
    </div>
  );
}
