"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { TabRail } from "@/components/tab-panel-shell";
import { useReaderSettings } from "@/hooks/use-reader-settings";
import type { CatalogBase } from "@/lib/catalog-paths";
import { readerContentStyle } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";
import type { Chapter, ChapterSummary } from "@/types";

import { ReaderNav } from "./reader-nav";

type ChapterReaderNavConfig = {
  slug: string;
  previous?: Pick<Chapter, "number">;
  next?: Pick<Chapter, "number">;
  chapters: ChapterSummary[];
  currentChapter: number;
  catalogBase?: CatalogBase;
  /** Bottom prev/next bar. Default true. */
  showBottomNav?: boolean;
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
  /** Single chapters payload shared by top and bottom nav. */
  nav?: ChapterReaderNavConfig;
}) {
  const { settings } = useReaderSettings();
  const immersive = settings.immersive;
  const chapterBackground = readerContentStyle(settings).backgroundColor;
  const tabFill =
    chapterBackground && chapterBackground !== "transparent"
      ? chapterBackground
      : "var(--background)";
  const [showChrome, setShowChrome] = useState(true);
  const immersiveEnabledRef = useRef(false);
  const showBottomNav = Boolean(nav && nav.showBottomNav !== false);

  useEffect(() => {
    if (!immersiveEnabledRef.current) {
      immersiveEnabledRef.current = true;
      if (immersive) setShowChrome(false);
      return;
    }
    if (!immersive) setShowChrome(true);
  }, [immersive]);

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
      chapters={nav.chapters}
      currentChapter={nav.currentChapter}
      showSettings
      catalogBase={nav.catalogBase}
      enableKeyboard
      framed={immersive}
    />
  ) : null;

  const bottomNav =
    showBottomNav && nav ? (
      <ReaderNav
        slug={nav.slug}
        previous={nav.previous}
        next={nav.next}
        chapters={nav.chapters}
        currentChapter={nav.currentChapter}
        menuPlacement="up"
        catalogBase={nav.catalogBase}
        framed={immersive}
      />
    ) : null;

  const chapterBody = (
    <div
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
            ? "fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md transition-transform duration-200 sm:px-6"
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
            "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md transition-transform duration-200 sm:px-6",
            chromeHidden && "pointer-events-none translate-y-full",
          )}
        >
          <div className="mx-auto w-full max-w-2xl">{bottomNav}</div>
        </div>
      ) : null}

      {immersive && showChrome && showBottomNav ? (
        <div className="h-16" aria-hidden />
      ) : null}
    </>
  );
}
