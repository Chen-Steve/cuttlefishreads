"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { GENRES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types";
import { NovelGrid } from "./novel-grid";

type Status = Novel["status"] | "all";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
];

export function NovelsBrowser({ novels }: { novels: Novel[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [genre, setGenre] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return novels.filter((novel) => {
      if (status !== "all" && novel.status !== status) return false;
      if (genre && !novel.genres.includes(genre as (typeof GENRES)[number])) return false;
      if (q) {
        const haystack = [
          novel.title,
          novel.author,
          novel.originalAuthor ?? "",
          novel.translator ?? "",
          novel.synopsis,
          ...novel.genres,
          ...novel.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [novels, query, status, genre]);

  const hasFilters = query.trim() !== "" || status !== "all" || genre !== null;

  function clearAll() {
    setQuery("");
    setStatus("all");
    setGenre(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="relative">
        <label className="flex h-10 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-4 pl-3.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <Search className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, genre…"
            className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:font-medium placeholder:leading-none placeholder:text-muted/80"
            aria-label="Search novels"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0 text-muted transition-colors hover:text-foreground"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </label>
      </div>

      {/* Status + genre filters */}
      <div className="flex flex-col gap-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                status === opt.value
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:bg-border hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Genre pills */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(genre === g ? null : g)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  genre === g
                    ? "bg-accent text-white"
                    : "bg-surface text-muted hover:bg-border hover:text-foreground",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result count + clear */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {filtered.length} title{filtered.length !== 1 ? "s" : ""}
          {hasFilters ? " found" : " in the collection"}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2} aria-hidden />
            Clear filters
          </button>
        )}
      </div>

      <NovelGrid novels={filtered} />
    </div>
  );
}
