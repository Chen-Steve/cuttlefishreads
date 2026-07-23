"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Novel } from "@/types";
import {
  CONTINUE_READING_LIMIT,
  listReadingProgress,
  type ReadingProgressEntry,
} from "@/lib/reading-progress";
import { cn } from "@/lib/utils";

type ContinueItem = {
  novel: Novel;
  chapterNumber: number;
};

function resolveContinueItems(
  novels: Novel[],
  progress: ReadingProgressEntry[],
): ContinueItem[] {
  const bySlug = new Map(novels.map((novel) => [novel.slug, novel]));
  const items: ContinueItem[] = [];

  for (const entry of progress) {
    const novel = bySlug.get(entry.slug);
    if (!novel || novel.chapterCount < 1) continue;

    const chapterNumber = Math.min(
      entry.chapterNumber,
      novel.chapterCount,
    );
    items.push({ novel, chapterNumber });
    if (items.length >= CONTINUE_READING_LIMIT) break;
  }

  return items;
}

function ContinueCard({ item }: { item: ContinueItem }) {
  const { novel, chapterNumber } = item;

  return (
    <li>
      <Link
        href={`/novels/${novel.slug}/${chapterNumber}`}
        className="group relative isolate flex items-center justify-between overflow-hidden px-2.5 py-2 outline-offset-[-2px] transition-colors hover:bg-background/60 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {novel.coverUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={novel.coverUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 -z-20 size-full object-cover opacity-35 grayscale contrast-150 [mask-image:radial-gradient(circle,black_0_1px,transparent_1.25px)] [mask-size:4px_4px] [-webkit-mask-image:radial-gradient(circle,black_0_1px,transparent_1.25px)] [-webkit-mask-size:4px_4px]"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-surface via-surface/90 to-surface/45"
              aria-hidden
            />
          </>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">
            {novel.title}
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
  novels,
  className = "mt-0 sm:mt-5",
}: {
  novels: Novel[];
  className?: string;
}) {
  const [items, setItems] = useState<ContinueItem[] | null>(null);

  useEffect(() => {
    function sync() {
      setItems(resolveContinueItems(novels, listReadingProgress()));
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cf-reading-progress", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cf-reading-progress", sync);
    };
  }, [novels]);

  // Empty peer placeholder keeps Featured flush when there is nothing to resume.
  if (!items || items.length === 0) {
    return <div className="peer/continue" aria-hidden />;
  }

  return (
    <section className={cn("peer/continue", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
          Continue reading
        </h2>
        <Link
          href="/library"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium leading-none text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          My library
          <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
        <ul className="relative divide-y divide-border">
          {items.map((item) => (
            <ContinueCard key={item.novel.id} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}
