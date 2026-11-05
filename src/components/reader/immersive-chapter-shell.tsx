"use client";

import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

import { TabRail } from "@/components/tab-panel-shell";
import { useReaderSettings } from "@/hooks/use-reader-settings";
import { chapterHref } from "@/lib/catalog-paths";
import { observeChapterProgress } from "@/lib/reader-prefetch";
import { readerContentStyle } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types";

import { ReaderNav } from "./reader-nav";

type ChapterReaderNavConfig = {
  slug: string;
  previous?: Pick<Chapter, "number">;
  next?: Pick<Chapter, "number">;
  currentChapter: number;
  /** Locked pages must not speculate beyond the unlock gate. */
  enablePrefetch?: boolean;
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "a, button, input, textarea, select, label, summary, [role='button'], [role='link'], [role='menuitem'], [role='option'], [role='switch'], [role='dialog'], [data-reader-chrome]",
    ),
  );
}

export function ImmersiveChapterShell({
  header,
  children,
  nav,
}: {
  header: ReactNode;
  children: ReactNode;
  /** Prev/next stay on the page. The contents menu loads the chapter list on open. */
  nav?: ChapterReaderNavConfig;
}) {
  const { settings } = useReaderSettings();
  const immersive = settings.immersive;
  const chapterBackground = readerContentStyle(settings).backgroundColor;
  const tabFill =
    chapterBackground && chapterBackground !== "transparent"
      ? chapterBackground
      : "var(--background)";
  const [showChrome, setShowChrome] = useState(!immersive);
  const [previousImmersive, setPreviousImmersive] = useState(immersive);
  if (previousImmersive !== immersive) {
    setPreviousImmersive(immersive);
    if (!immersive) setShowChrome(true);
  }
  const router = useRouter();
  const chapterBodyRef = useRef<HTMLDivElement>(null);
  const prefetchedHref = useRef<string | null>(null);
  const nextHref = nav?.next && nav.enablePrefetch !== false
    ? chapterHref(nav.slug, nav.next.number)
    : null;
  const prefetchNext = useCallback(() => {
    if (!nextHref || prefetchedHref.current === nextHref || document.visibilityState === "hidden") return;
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (
      connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g" ||
      !navigator.onLine
    ) {
      return;
    }
    prefetchedHref.current = nextHref;
    router.prefetch(nextHref, {
      kind: PrefetchKind.FULL,
      onInvalidate: () => {
        if (prefetchedHref.current === nextHref) prefetchedHref.current = null;
      },
    });
  }, [nextHref, router]);

  useEffect(() => {
    if (!nextHref || !chapterBodyRef.current) return;
    // Give the next chapter the entire reading time to load. Check again near
    // the end in case a long reading session outlasted the prefetched cache.
    prefetchNext();
    return observeChapterProgress(chapterBodyRef.current, prefetchNext);
  }, [nextHref, prefetchNext]);

  function onContentClick(event: MouseEvent<HTMLDivElement>) {
    if (!immersive) return;
    if (isInteractiveTarget(event.target)) return;
    setShowChrome((visible) => !visible);
  }

  const chromeHidden = immersive && !showChrome;

  const topNav = nav ? (
    <ReaderNav
      slug={nav.slug}
      previous={nav.previous}
      next={nav.next}
      currentChapter={nav.currentChapter}
      showSettings
      enableKeyboard
      framed={immersive}
      onNextIntent={prefetchNext}
    />
  ) : null;

  const bottomNav = nav ? (
    <ReaderNav
      slug={nav.slug}
      previous={nav.previous}
      next={nav.next}
      currentChapter={nav.currentChapter}
      menuPlacement="up"
      framed={immersive}
      onNextIntent={prefetchNext}
    />
  ) : null;

  const chapterBody = (
    <div
      ref={chapterBodyRef}
      className={cn(!immersive && "py-5 sm:py-6")}
      onClick={onContentClick}
    >
      {children}
    </div>
  );

  return (
    <>
      <header
        data-reader-chrome={immersive ? "" : undefined}
        className={cn(
          immersive
            ? "fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background px-4 py-3 transition-transform duration-200 sm:px-6"
            : "mb-3",
          chromeHidden && "pointer-events-none -translate-y-full",
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-2.5",
            immersive && "mx-auto w-full max-w-2xl",
          )}
        >
          {header}
          {immersive ? topNav : null}
        </div>
      </header>

      {immersive && showChrome ? <div className="h-36 sm:h-40" aria-hidden /> : null}

      {immersive || !nav ? (
        chapterBody
      ) : (
        <>
          {topNav ? (
            <TabRail position="top" tab={topNav} fill={tabFill} />
          ) : null}
          {chapterBody}
          {bottomNav ? (
            <TabRail position="bottom" tab={bottomNav} fill={tabFill} />
          ) : null}
        </>
      )}

      {immersive && bottomNav ? (
        <div
          data-reader-chrome=""
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background px-4 py-3 transition-transform duration-200 sm:px-6",
            chromeHidden && "pointer-events-none translate-y-full",
          )}
        >
          <div className="mx-auto w-full max-w-2xl">{bottomNav}</div>
        </div>
      ) : null}

      {immersive && showChrome && nav ? (
        <div className="h-16" aria-hidden />
      ) : null}
    </>
  );
}
