"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { useStoredOpen } from "@/hooks/use-stored-open";
import { DitheredImageBackground } from "@/components/dithered-image-background";
import { TabPanelShell } from "@/components/tab-panel-shell";
import { chapterPublicHref } from "@/lib/catalog-paths";
import {
  CONTINUE_READING_LIMIT,
  listReadingProgress,
  type ReadingProgressEntry,
} from "@/lib/reading-progress";
import { cn } from "@/lib/utils";

type ContinueItem = {
  slug: string;
  title: string;
  coverUrl?: string;
  chapterNumber: number;
};

function resolveContinueItems(progress: ReadingProgressEntry[]): ContinueItem[] {
  const items: ContinueItem[] = [];

  for (const entry of progress) {
    if (!entry.title || !entry.chapterCount || entry.chapterCount < 1) continue;

    items.push({
      slug: entry.slug,
      title: entry.title,
      coverUrl: entry.coverUrl,
      chapterNumber: Math.min(entry.chapterNumber, entry.chapterCount),
    });
    if (items.length >= CONTINUE_READING_LIMIT) break;
  }

  return items;
}

function ContinueCard({ item }: { item: ContinueItem }) {
  const { slug, title, coverUrl, chapterNumber } = item;

  return (
    <li>
      <Link
        href={chapterPublicHref({ slug }, chapterNumber)}
        className="group relative isolate flex items-center justify-between overflow-hidden px-2.5 py-2 outline-offset-[-2px] transition-colors hover:bg-background/60 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {coverUrl ? (
          <>
            <DitheredImageBackground
              src={coverUrl}
              className="-z-20"
            />
            <span
              className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-surface via-surface/90 to-surface/45"
              aria-hidden
            />
          </>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-muted">Ch. {chapterNumber}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
          <ArrowRight className="size-4.5" strokeWidth={2} aria-hidden />
        </span>
      </Link>
    </li>
  );
}

export function ContinueReadingSection({
  className = "mt-0 sm:mt-5",
}: {
  className?: string;
}) {
  const [items, setItems] = useState<ContinueItem[] | null>(null);
  const { open, toggle } = useStoredOpen("cf-home-section-continue", true);
  const panelId = useId();

  useEffect(() => {
    function sync() {
      setItems(resolveContinueItems(listReadingProgress()));
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cf-reading-progress", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cf-reading-progress", sync);
    };
  }, []);

  // Empty peer placeholder keeps Featured flush when there is nothing to resume.
  if (!items || items.length === 0) {
    return <div className="peer/continue" aria-hidden />;
  }

  return (
    <section
      className={cn("peer/continue", className)}
      data-state={open ? "open" : "closed"}
    >
      <TabPanelShell
        leftTab={
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={toggle}
            className="inline-flex h-9 items-center gap-1.5 px-4 text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <h2>Continue reading</h2>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={2}
              aria-hidden
            />
          </button>
        }
        rightTab={
          <Link
            href="/library"
            className="inline-flex h-9 items-center gap-1.5 px-4 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            My library
            <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
          </Link>
        }
      >
        {open ? (
          <ul id={panelId} className="relative divide-y divide-border">
            {items.map((item) => (
              <ContinueCard key={item.slug} item={item} />
            ))}
          </ul>
        ) : (
          <div id={panelId} hidden />
        )}
      </TabPanelShell>
    </section>
  );
}
