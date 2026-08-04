"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { useReaderSettings } from "@/hooks/use-reader-settings";
import type { CatalogBase } from "@/lib/catalog-paths";
import { cn } from "@/lib/utils";
import type { Chapter, ChapterSummary } from "@/types";

import { ReaderNav } from "./reader-nav";

const CHAPTER_PATH = /^\/(?:novels|series)\/[^/]+\/(?:chapter\/)?\d+\/?$/;

export type ChapterReaderNavConfig = {
  slug: string;
  previous?: Pick<Chapter, "number">;
  next?: Pick<Chapter, "number">;
  chapters: ChapterSummary[];
  currentChapter: number;
  catalogBase?: CatalogBase;
  /** Bottom prev/next bar; omit on locked chapters. Default true. */
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

/** Hides the site header on chapter pages when immersive reading is on. */
export function useImmersiveHidesSiteHeader() {
  const pathname = usePathname();
  const { settings } = useReaderSettings();
  return settings.immersive && CHAPTER_PATH.test(pathname);
}

export function ImmersiveChapterShell({
  header,
  content,
  nav,
}: {
  header: ReactNode;
  content: ReactNode;
  /** Single chapters payload shared by top and bottom nav. */
  nav?: ChapterReaderNavConfig;
}) {
  const { settings } = useReaderSettings();
  const immersive = settings.immersive;
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

  return (
    <>
      <header
        data-reader-chrome={immersive ? "" : undefined}
        className={cn(
          "mb-5",
          immersive &&
            "fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md transition-transform duration-200 sm:px-6",
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
          {nav ? (
            <ReaderNav
              slug={nav.slug}
              previous={nav.previous}
              next={nav.next}
              chapters={nav.chapters}
              currentChapter={nav.currentChapter}
              showSettings
              catalogBase={nav.catalogBase}
            />
          ) : null}
        </div>
      </header>

      {immersive && showChrome ? <div className="h-36 sm:h-40" aria-hidden /> : null}

      <div onClick={onContentClick}>{content}</div>

      {showBottomNav && nav ? (
        <div
          data-reader-chrome={immersive ? "" : undefined}
          className={cn(
            "mt-8",
            immersive &&
              "fixed inset-x-0 bottom-0 z-40 mt-0 border-t border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md transition-transform duration-200 sm:px-6",
            chromeHidden && "pointer-events-none translate-y-full",
          )}
        >
          <div className={cn(immersive && "mx-auto w-full max-w-2xl")}>
            <ReaderNav
              slug={nav.slug}
              previous={nav.previous}
              next={nav.next}
              chapters={nav.chapters}
              currentChapter={nav.currentChapter}
              menuPlacement="up"
              catalogBase={nav.catalogBase}
            />
          </div>
        </div>
      ) : null}

      {immersive && showChrome && showBottomNav ? (
        <div className="h-16" aria-hidden />
      ) : null}
    </>
  );
}
