"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Pencil, Search, User } from "lucide-react";

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
  publisher_id: string | null;
  translator: string | null;
  translator_username: string | null;
};

export type TranslatorOption = {
  id: string;
  label: string;
  count: number;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
] as const;

function TranslatorFilterDropdown({
  options,
  value,
  totalCount,
  onChange,
}: {
  options: TranslatorOption[];
  value: string;
  totalCount: number;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedLabel =
    value === "all"
      ? "All translators"
      : (options.find((o) => o.id === value)?.label ?? "Translator");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Filter by translator"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium leading-none text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-3"
      >
        <User className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="max-w-36 truncate">{selectedLabel}</span>
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
          className="absolute left-0 top-full z-30 mt-1.5 min-w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-background",
              value === "all" && "bg-background",
            )}
          >
            <User className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 flex-1 truncate">All translators</span>
            <span className="shrink-0 tabular-nums text-muted">{totalCount}</span>
          </button>

          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-background",
                value === option.id && "bg-background",
              )}
            >
              <User className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <span className="shrink-0 tabular-nums text-muted">{option.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NovelsGrid({
  novels,
  translatorOptions = [],
}: {
  novels: NovelRow[];
  translatorOptions?: TranslatorOption[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [translatorFilter, setTranslatorFilter] = useState("all");

  const filtered = useMemo(
    () =>
      novels.filter((n) => {
        const publisherKey = n.publisher_id ?? "__unassigned__";
        return (
          (statusFilter === "all" || n.status === statusFilter) &&
          (translatorFilter === "all" || publisherKey === translatorFilter) &&
          (!query || n.title.toLowerCase().includes(query.toLowerCase()))
        );
      }),
    [novels, query, statusFilter, translatorFilter],
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
                  statusFilter === f.value
                    ? "bg-accent text-accent-foreground"
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

          {translatorOptions.length > 1 ? (
            <TranslatorFilterDropdown
              options={translatorOptions}
              value={translatorFilter}
              totalCount={novels.length}
              onChange={setTranslatorFilter}
            />
          ) : null}
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
