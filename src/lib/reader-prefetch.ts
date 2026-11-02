export const CHAPTER_PREFETCH_PROGRESS = 0.65;

/** Observe the chapter itself, independent of comments, menus and the footer. */
export function observeChapterProgress(container: HTMLElement, prefetch: () => void): () => void {
  let frame = 0;
  let finished = false;
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);

  function cleanup() {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", schedule);
    resize?.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
  }

  function check() {
    frame = 0;
    if (finished || document.visibilityState === "hidden") return;
    // Streaming content may not have arrived when the reader chrome mounts.
    const prose = container.querySelector<HTMLElement>("[data-chapter-prose]");
    if (!prose) return;
    const { top, height } = prose.getBoundingClientRect();
    if (height <= 0 || (window.innerHeight - top) / height < CHAPTER_PREFETCH_PROGRESS) return;
    finished = true;
    cleanup();
    prefetch();
  }

  function schedule() {
    if (!finished && !frame) frame = window.requestAnimationFrame(check);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  document.addEventListener("visibilitychange", schedule);
  resize?.observe(container);
  schedule();
  return () => { finished = true; cleanup(); };
}
