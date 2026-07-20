"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { GENRES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types";
import { NovelGrid } from "./novel-grid";

type Status = Novel["status"] | "all";

type SortOption =
  | "updated"
  | "title-asc"
  | "title-desc"
  | "views-desc"
  | "views-asc";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "views-desc", label: "Most views" },
  { value: "views-asc", label: "Least views" },
];

function SortDropdown({
  value,
  onChange,
  className,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected =
    SORT_OPTIONS.find((opt) => opt.value === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative min-w-0 flex-1 sm:flex-none sm:shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort novels: ${selected.label}`}
        className="inline-flex h-9 w-full items-center justify-start gap-1.5 rounded-xl px-3 text-sm font-medium leading-none text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
      >
        <ArrowUpDown className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="max-w-40 truncate">{selected.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full left-0 z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-md sm:left-auto sm:right-0 sm:w-auto sm:min-w-48"
        >
          {SORT_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {opt.label}
                </span>
                {isSelected ? (
                  <Check
                    className="size-4 shrink-0 text-muted"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function sortNovels(
  novels: Novel[],
  sort: SortOption,
  viewsBySlug: Record<string, number>,
): Novel[] {
  const items = [...novels];
  switch (sort) {
    case "title-asc":
      return items.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    case "title-desc":
      return items.sort((a, b) =>
        b.title.localeCompare(a.title, undefined, { sensitivity: "base" }),
      );
    case "views-desc":
      return items.sort(
        (a, b) => (viewsBySlug[b.slug] ?? 0) - (viewsBySlug[a.slug] ?? 0),
      );
    case "views-asc":
      return items.sort(
        (a, b) => (viewsBySlug[a.slug] ?? 0) - (viewsBySlug[b.slug] ?? 0),
      );
    case "updated":
    default:
      return items.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}

export function NovelsBrowser({
  novels,
  viewsBySlug = {},
}: {
  novels: Novel[];
  viewsBySlug?: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [genre, setGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("updated");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = novels.filter((novel) => {
      if (status !== "all" && novel.status !== status) return false;
      if (genre && !novel.genres.includes(genre as (typeof GENRES)[number]))
        return false;
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
    return sortNovels(matched, sort, viewsBySlug);
  }, [novels, query, status, genre, sort, viewsBySlug]);

  const hasFilters = query.trim() !== "" || status !== "all" || genre !== null;
  const activePillFilters =
    (status !== "all" ? 1 : 0) + (genre !== null ? 1 : 0);

  function clearAll() {
    setQuery("");
    setStatus("all");
    setGenre(null);
  }

  const pillClass = (active: boolean) =>
    cn(
      "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      active
        ? "bg-accent text-accent-foreground"
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

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex h-9 w-full cursor-text items-center gap-1.5 rounded-full border border-border bg-surface py-0 pr-3 pl-3 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 sm:min-w-0 sm:flex-1">
            <Search
              className="size-3.5 shrink-0 text-muted"
              strokeWidth={1.75}
              aria-hidden
            />
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

          <div className="flex items-center gap-2 sm:contents">
            <SortDropdown value={sort} onChange={setSort} />

            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
            >
              <SlidersHorizontal className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">
                {filtersOpen ? "Hide filters" : "Show filters"}
              </span>
              {activePillFilters > 0 ? (
                <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent-foreground">
                  {activePillFilters}
                </span>
              ) : null}
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 transition-transform",
                  filtersOpen && "rotate-180",
                )}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-2",
            filtersOpen ? "flex" : "hidden sm:flex",
          )}
        >
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                aria-pressed={status === opt.value}
                className={pillClass(status === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(genre === g ? null : g)}
                aria-pressed={genre === g}
                className={pillClass(genre === g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <NovelGrid novels={filtered} showChapterCount hideAuthor tightGap />
    </div>
  );
}
