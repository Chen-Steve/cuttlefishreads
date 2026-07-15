"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_SPEED = 32; // px per second
const RESUME_DELAY_MS = 1600;

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-x-2 pr-2">
      {tags.map((tag) => (
        <span key={tag} className="shrink-0 text-xs text-muted">
          #{tag}
        </span>
      ))}
    </div>
  );
}

export function ScrollingTags({ tags }: { tags: string[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const [looping, setLooping] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    const set = setRef.current;
    if (!el || !set || tags.length === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let rafId = 0;
    let lastTs = 0;
    let setWidth = 0;
    let needsDuplicate = false;
    let autoScroll = false;
    let pausedByUser = false;
    let resumeTimer = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let pointerId: number | null = null;

    const measure = () => {
      setWidth = set.scrollWidth;
      needsDuplicate = setWidth > el.clientWidth + 4;
      autoScroll = needsDuplicate && !reduceMotion;
      setLooping(needsDuplicate);
      if (!needsDuplicate && el.scrollLeft !== 0) el.scrollLeft = 0;
    };

    const wrapScroll = () => {
      if (!needsDuplicate || setWidth <= 0) return;
      while (el.scrollLeft >= setWidth) el.scrollLeft -= setWidth;
      while (el.scrollLeft < 0) el.scrollLeft += setWidth;
    };

    const tick = (ts: number) => {
      rafId = requestAnimationFrame(tick);
      if (!autoScroll || pausedByUser || dragging) {
        lastTs = ts;
        return;
      }
      if (!lastTs) {
        lastTs = ts;
        return;
      }
      const dt = Math.min(48, ts - lastTs) / 1000;
      lastTs = ts;
      el.scrollLeft += SCROLL_SPEED * dt;
      wrapScroll();
    };

    const pause = () => {
      pausedByUser = true;
      window.clearTimeout(resumeTimer);
    };

    const scheduleResume = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        pausedByUser = false;
        lastTs = 0;
      }, RESUME_DELAY_MS);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!needsDuplicate) return;
      // Touch uses native overflow scrolling; mouse gets custom drag.
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pause();
      dragging = true;
      pointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartScroll = el.scrollLeft;
      el.setPointerCapture(event.pointerId);
      el.classList.add("cursor-grabbing");
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      el.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
      wrapScroll();
    };

    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      el.classList.remove("cursor-grabbing");
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        // already released
      }
      scheduleResume();
    };

    const onScroll = () => {
      wrapScroll();
    };

    const onWheel = () => {
      if (!needsDuplicate) return;
      pause();
      scheduleResume();
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(set);

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", scheduleResume);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(resumeTimer);
      ro.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", scheduleResume);
    };
  }, [tags]);

  if (tags.length === 0) return null;

  return (
    <div
      ref={scrollerRef}
      className={`min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
        looping ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      aria-label="Tags"
    >
      <div className="flex w-max flex-nowrap">
        <div ref={setRef}>
          <TagList tags={tags} />
        </div>
        {looping ? (
          <div aria-hidden>
            <TagList tags={tags} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
