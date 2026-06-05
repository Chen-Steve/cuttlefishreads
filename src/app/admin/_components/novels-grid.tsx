"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookPlus, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type NovelRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  cover_url: string | null;
  genres: string[];
  updated_at: string;
  chapter_count: number;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  ongoing: "text-emerald-700 bg-emerald-500/10 border-emerald-500/25",
  completed: "text-sky-700 bg-sky-500/10 border-sky-500/25",
  hiatus: "text-amber-700 bg-amber-500/10 border-amber-500/25",
};

const PALETTES = [
  "from-[#d8c3a5] to-[#a6845c]",
  "from-[#c9b79c] to-[#8c7355]",
  "from-[#e0cdb4] to-[#b8956a]",
  "from-[#cbb89d] to-[#9a7f5f]",
  "from-[#ddc9ad] to-[#ad8b62]",
  "from-[#d2bfa3] to-[#937a5b]",
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter((w) => /[a-z]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function CoverThumb({ novel }: { novel: NovelRow }) {
  if (novel.cover_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={novel.cover_url}
        alt=""
        aria-hidden
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br",
        paletteFor(novel.slug),
      )}
      aria-hidden
    >
      <span className="text-xs font-bold text-white/90">{initials(novel.title)}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NovelsGrid({ novels }: { novels: NovelRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      novels.filter(
        (n) =>
          (statusFilter === "all" || n.status === statusFilter) &&
          (!query || n.title.toLowerCase().includes(query.toLowerCase())),
      ),
    [novels, query, statusFilter],
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
                statusFilter === f.value
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground",
              )}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1.5 tabular-nums opacity-60">
                  {novels.filter((n) => n.status === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <label className="flex h-9 items-center gap-2 rounded-xl border border-border bg-surface pl-3 pr-3.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 sm:w-60">
          <Search className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            placeholder="Search titles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted/70"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
          {novels.length === 0
            ? 'No novels yet — click "Create novel" to get started.'
            : "No novels match your filters."}
        </p>
      ) : (
        <div className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {filtered.map((novel) => (
            <div
              key={novel.id}
              className="flex items-center gap-4 px-4 py-3.5"
            >
              <div className="relative aspect-[3/4] h-12 shrink-0 overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
                <CoverThumb novel={novel} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {novel.title}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span className="truncate">/{novel.slug}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {novel.chapter_count}{" "}
                    {novel.chapter_count === 1 ? "chapter" : "chapters"}
                  </span>
                  <span aria-hidden className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    Updated {formatDate(novel.updated_at)}
                  </span>
                </p>
              </div>

              <span
                className={cn(
                  "hidden shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize sm:inline-flex",
                  STATUS_STYLE[novel.status] ?? "border-border bg-surface text-muted",
                )}
              >
                {novel.status}
              </span>

              <Link
                href={`/admin/novels/${novel.id}/chapters/new`}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <BookPlus className="size-3.5" strokeWidth={1.75} aria-hidden />
                <span className="hidden sm:inline">Add chapter</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
