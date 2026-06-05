"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Pencil, Search } from "lucide-react";

import { NovelCover } from "@/components/novel/novel-cover";
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
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((novel) => (
            <div
              key={novel.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/30"
            >
              <NovelCover
                title={novel.title}
                slug={novel.slug}
                coverUrl={novel.cover_url ?? undefined}
              />

              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {novel.title}
              </p>

              <div className="flex flex-col gap-2">
                <Link
                  href={`/admin/novels/${novel.id}/chapters`}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <BookOpen className="size-3.5" strokeWidth={1.75} aria-hidden />
                  Chapters
                </Link>
                <Link
                  href={`/admin/novels/${novel.id}/edit`}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
