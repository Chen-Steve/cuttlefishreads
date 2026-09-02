"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Novel } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  novelHref,
  type CatalogBase,
} from "@/lib/catalog-paths";
import { NovelCover, COVER_SIZES_DENSE } from "./novel-cover";
import { DENSE_FILL_ROW_LIMIT } from "./novel-grid";

const PREVIEW_LENGTH = 220;

function previewSynopsis(synopsis: string): string {
  const plain = synopsis
    .replace(/\r\n/g, "\n")
    .replace(/[*_~`#>[\]()!-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= PREVIEW_LENGTH) return plain;

  const slice = plain.slice(0, PREVIEW_LENGTH);
  const lastSpace = slice.lastIndexOf(" ");
  const truncated = lastSpace > 120 ? slice.slice(0, lastSpace) : slice;
  return `${truncated.replace(/[.,;:!?-]+$/, "")}…`;
}

function FeaturedCoverButton({
  novel,
  selected,
  onSelect,
  controlsId,
  priority = false,
}: {
  novel: Novel;
  selected: boolean;
  onSelect: () => void;
  controlsId: string;
  priority?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls={controlsId}
      className="group relative block w-full rounded-lg outline-offset-2 transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <NovelCover
        title={novel.title}
        slug={novel.slug}
        coverUrl={novel.coverUrl}
        sizes={COVER_SIZES_DENSE}
        priority={priority}
      />
      {selected ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-lg ring-4 ring-inset ring-accent"
          aria-hidden
        />
      ) : null}
      <span className="sr-only">{novel.title}</span>
    </button>
  );
}

function FeaturedDetails({
  novel,
  panelId,
  catalogBase,
}: {
  novel: Novel;
  panelId: string;
  catalogBase: CatalogBase;
}) {
  const detailHref = novelHref(novel.slug, catalogBase);
  const synopsisPreview = novel.synopsis ? previewSynopsis(novel.synopsis) : "";

  return (
    <div
      id={panelId}
      role="region"
      aria-live="polite"
      aria-label={`${novel.title} details`}
      className="mt-1.5 rounded-xl bg-surface px-4 py-4 sm:mt-2 sm:px-5 sm:py-5"
    >
      <Link
        href={detailHref}
        className="text-base font-semibold leading-snug text-foreground hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-lg"
      >
        {novel.title}
      </Link>

      <p className="mt-1 text-sm tabular-nums text-muted">
        {novel.chapterCount}{" "}
        {novel.chapterCount === 1 ? "chapter" : "chapters"}
      </p>

      {novel.genres.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {novel.genres.map((genre) => (
            <Badge key={genre}>{genre}</Badge>
          ))}
        </div>
      ) : null}

      {synopsisPreview ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {synopsisPreview}
        </p>
      ) : null}

      <Link
        href={detailHref}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-11 sm:w-fit"
      >
        <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
        Start reading
      </Link>
    </div>
  );
}

export function FeaturedNovels({
  novels,
  catalogBase = "novels",
  emptyLabel = "No novels found.",
}: {
  novels: Novel[];
  catalogBase?: CatalogBase;
  emptyLabel?: string;
}) {
  const panelId = useId();
  const [selectedSlug, setSelectedSlug] = useState(novels[0]?.slug ?? "");

  if (novels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  const desktopNovels = novels.slice(0, DENSE_FILL_ROW_LIMIT);
  const selected =
    novels.find((novel) => novel.slug === selectedSlug) ?? novels[0];

  return (
    <div>
      <div
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] sm:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Featured novels"
      >
        {novels.map((novel, index) => (
          <div key={novel.id} className="w-[7.5rem] shrink-0 snap-start">
            <FeaturedCoverButton
              novel={novel}
              selected={selected.slug === novel.slug}
              onSelect={() => setSelectedSlug(novel.slug)}
              controlsId={panelId}
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      <div
        className="hidden grid-cols-4 gap-x-2.5 gap-y-3 sm:grid lg:grid-cols-6 xl:grid-cols-7 sm:max-lg:[&>*:nth-child(n+5)]:hidden lg:max-xl:[&>*:nth-child(n+7)]:hidden xl:[&>*:nth-child(n+8)]:hidden"
        aria-label="Featured novels"
      >
        {desktopNovels.map((novel, index) => (
          <FeaturedCoverButton
            key={novel.id}
            novel={novel}
            selected={selected.slug === novel.slug}
            onSelect={() => setSelectedSlug(novel.slug)}
            controlsId={panelId}
            priority={index === 0}
          />
        ))}
      </div>

      <FeaturedDetails
        novel={selected}
        panelId={panelId}
        catalogBase={catalogBase}
      />
    </div>
  );
}
