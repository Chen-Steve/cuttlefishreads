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

  const pillClass = (active: boolean) =>
    cn(
      "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      active
        ? "bg-accent text-white"
        : "bg-surface text-muted hover:bg-border hover:text-foreground",
    );

  return (
    <div className="flex flex-col gap-3">
      <header className="mb-1 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          All novels
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-xs text-muted">
            {filtered.length} title{filtered.length !== 1 ? "s" : ""}
            {hasFilters ? " found" : ""}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              <X className="size-3" strokeWidth={2} aria-hidden />
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Search + status */}
      <div className="flex flex-col gap-2">
        <label className="flex h-9 w-full cursor-text items-center gap-1.5 rounded-full border border-border bg-surface py-0 pr-3 pl-3 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <Search className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
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
              <X className="size-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </label>

        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={pillClass(status === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre pills */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(genre === g ? null : g)}
              className={pillClass(genre === g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <NovelGrid novels={filtered} />
    </div>
  );
}
