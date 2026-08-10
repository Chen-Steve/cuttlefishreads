"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Chapter, ChapterSummary } from "@/types";
import { type CatalogBase, chapterHref } from "@/lib/catalog-paths";
import { cn } from "@/lib/utils";
import { ChapterContentsDropdown } from "./chapter-contents-dropdown";
import { ReaderSettingsPanel } from "./reader-settings-panel";
import { readerChromeBtnClass } from "./reader-chrome";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function ReaderNav({
  slug,
  previous,
  next,
  chapters,
  currentChapter,
  menuPlacement = "down",
  showSettings = false,
  catalogBase = "novels",
  enableKeyboard = false,
}: {
  slug: string;
  previous?: Pick<Chapter, "number">;
  next?: Pick<Chapter, "number">;
  chapters: ChapterSummary[];
  currentChapter: number;
  menuPlacement?: "up" | "down";
  showSettings?: boolean;
  catalogBase?: CatalogBase;
  /** Only one nav instance should own keyboard shortcuts. */
  enableKeyboard?: boolean;
}) {
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const previousHref = previous
    ? chapterHref(slug, previous.number, catalogBase)
    : undefined;
  const nextHref = next
    ? chapterHref(slug, next.number, catalogBase)
    : undefined;

  useEffect(() => {
    if (!enableKeyboard) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target)) return;

      if (event.key === "ArrowLeft" && previousHref) {
        event.preventDefault();
        router.push(previousHref);
      } else if (event.key === "ArrowRight" && nextHref) {
        event.preventDefault();
        router.push(nextHref);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableKeyboard, previousHref, nextHref, router]);

  return (
    <nav
      ref={navRef}
      aria-label="Chapter navigation"
      className="mx-auto flex w-full max-w-md items-center gap-0.5 rounded-2xl border border-border/80 bg-surface/90 p-1 shadow-sm"
    >
      <ReaderLink
        href={previousHref}
        icon={<ChevronLeft className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />}
        label={
          previous
            ? `Previous chapter (Ch. ${previous.number})`
            : "Previous chapter"
        }
        text={previous ? `Ch. ${previous.number}` : undefined}
        side="prev"
      />

      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
        <ChapterContentsDropdown
          slug={slug}
          chapters={chapters}
          currentChapter={currentChapter}
          placement={menuPlacement}
          catalogBase={catalogBase}
          navRef={navRef}
        />
        {showSettings ? (
          <ReaderSettingsPanel placement={menuPlacement} navRef={navRef} />
        ) : null}
      </div>

      <ReaderLink
        href={nextHref}
        icon={<ChevronRight className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />}
        label={next ? `Next chapter (Ch. ${next.number})` : "Next chapter"}
        text={next ? `Ch. ${next.number}` : undefined}
        side="next"
      />
    </nav>
  );
}

function ReaderLink({
  href,
  icon,
  label,
  text,
  side,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  text?: string;
  side: "prev" | "next";
}) {
  const classes = cn(
    readerChromeBtnClass,
    "min-w-8 shrink-0 px-1.5 tabular-nums",
    text ? "gap-0.5 px-2" : "size-8 px-0",
    !href && "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-muted",
  );

  const content = (
    <>
      {side === "prev" ? icon : null}
      {text ? (
        <span className="text-xs font-semibold sm:text-sm">{text}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
      {side === "next" ? icon : null}
      {text ? <span className="sr-only">{label}</span> : null}
    </>
  );

  if (!href) {
    return (
      <span className={classes} aria-disabled>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={classes} title={label}>
      {content}
    </Link>
  );
}
