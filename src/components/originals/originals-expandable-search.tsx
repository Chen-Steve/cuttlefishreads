"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { novelHref } from "@/lib/catalog-paths";
import { originalsPublicUrl } from "@/lib/hosts";
import { cn } from "@/lib/utils";

type SearchMatch = {
  slug: string;
  title: string;
  coverUrl?: string;
};

/** Inline search form used in the desktop header (and mobile overlay). */
export function OriginalsHeaderSearch({
  autoFocus = false,
  onMatchClick,
  className,
}: {
  autoFocus?: boolean;
  onMatchClick?: () => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestion, setSuggestion] = useState<{
    query: string;
    match: SearchMatch | null;
  } | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();
  const match =
    suggestion?.query === trimmedQuery ? suggestion.match : null;
  const showMatch = focused && trimmedQuery.length > 0 && match;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search-suggestions?q=${encodeURIComponent(trimmedQuery)}&type=original`,
          { signal: controller.signal },
        );
        if (!response.ok) return;

        const data = (await response.json()) as { match?: SearchMatch | null };
        setSuggestion({ query: trimmedQuery, match: data.match ?? null });
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          setSuggestion({ query: trimmedQuery, match: null });
        }
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  return (
    <form
      role="search"
      action={originalsPublicUrl("/browse")}
      className={cn("relative", className)}
    >
      <label className="flex h-10 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-3 pl-3.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 sm:h-9">
        <Search
          className="size-4 shrink-0 text-muted"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 100)}
          placeholder="Search originals by title…"
          className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:font-medium placeholder:leading-none placeholder:text-muted/80"
          aria-label="Search originals"
          autoComplete="off"
        />
      </label>

      {showMatch ? (
        <Link
          href={novelHref(match.slug, "series")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onMatchClick}
          className="absolute top-full right-0 left-0 z-50 mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-left shadow-md transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-background">
            {match.coverUrl ? (
              <Image
                src={match.coverUrl}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {match.title}
            </span>
            <span className="block text-xs text-muted">Closest title match</span>
          </span>
        </Link>
      ) : null}
    </form>
  );
}

/** Icon button that opens the expanded header search (mobile). */
export function OriginalsSearchTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search originals"
      aria-expanded={false}
      className="inline-flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
    >
      <Search className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

/** Full-width overlay search that covers the Originals header row (mobile). */
export function OriginalsSearchOverlay({
  onClose,
}: {
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-50 flex items-center gap-2 bg-background/95 px-4 backdrop-blur-sm sm:hidden">
      <OriginalsHeaderSearch
        autoFocus
        onMatchClick={onClose}
        className="min-w-0 flex-1"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="size-5" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
