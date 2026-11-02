"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CommentSectionData } from "@/lib/comment-section-data";
import { CommentsFallback } from "./comments-fallback";

const CommentsPanel = dynamic(() => import("./comments-panel").then((m) => m.CommentsPanel), {
  loading: CommentsFallback,
});

export function LazyComments({ mode, novelSlug, chapterNumber }: {
  mode: "novel" | "chapter";
  novelSlug: string;
  chapterNumber?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const loaded = useRef(false);
  const [data, setData] = useState<CommentSectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (loaded.current || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setLoading(true);
    const query = mode === "chapter" ? `?chapter=${chapterNumber}` : "";
    // Fetch data and the editor/thread bundle together, only when needed.
    Promise.all([
      fetch(`/api/novels/${encodeURIComponent(novelSlug)}/comments${query}`, {
        cache: "no-store", signal: controller.signal,
      }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load comments. Please try again.");
        return body as CommentSectionData;
      }),
      import("./comments-panel"),
    ]).then(([result]) => {
      if (controller.signal.aborted) return;
      loaded.current = true;
      setData(result);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load comments. Please try again.");
    }).finally(() => {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    });
  }, [novelSlug, chapterNumber, mode]);

  useEffect(() => {
    const target = container.current;
    if (!target) return;
    const onHashChange = () => {
      if (/^#comment-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(window.location.hash)) load();
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    // A button remains available if IntersectionObserver is unsupported.
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer?.disconnect();
        load();
      }
    }, { rootMargin: "400px 0px" });
    observer?.observe(target);
    return () => {
      observer?.disconnect();
      window.removeEventListener("hashchange", onHashChange);
      request.current?.abort();
      request.current = null;
    };
  }, [load]);

  return (
    <div ref={container} data-lazy-comments>
      {data ? <CommentsPanel mode={mode} novelSlug={novelSlug} chapterNumber={chapterNumber}
        initialComments={data.comments} initialHasMore={data.hasMore} initialCursor={data.nextCursor}
        isLoggedIn={data.isLoggedIn} readableChapters={data.readableChapters} chapterTitles={data.chapterTitles} /> :
        loading ? <CommentsFallback /> : (
          <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
            {error ? <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <button type="button" onClick={load}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:text-accent">
              {error ? "Retry loading comments" : "Load comments"}
            </button>
          </div>
        )}
    </div>
  );
}
