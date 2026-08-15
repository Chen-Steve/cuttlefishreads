"use client";

import { useMemo, useRef, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { ChevronLeft, FolderUp, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { TabPanelShell } from "@/components/tab-panel-shell";
import {
  filesFromDataTransfer,
  prepareChapterImports,
  type PreparedChapterImport,
} from "@/lib/chapter-import-browser";
import { MAX_IMPORT_CHAPTERS } from "@/lib/chapter-import";
import {
  formatSuggestedUnlockPreview,
  getSuggestedUnlockAt,
} from "@/lib/suggested-unlock-at";
import {
  buildUnlockSchedule,
  DEFAULT_RELEASE_WEEKDAYS,
  WEEKDAYS,
  weekdayLabels,
} from "@/lib/bulk-unlock-schedule";
import { bulkCreateChapters } from "../actions";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";

function toDatetimeLocal(value: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatUnlockChip(value: Date): string {
  return value.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function BulkChapterUpload({
  novelId,
  backHref,
  nextChapterNumber,
  existingNumbers,
  latestChapterUnlockAt = null,
  defaultCoinCost = null,
}: {
  novelId: string;
  backHref: string;
  nextChapterNumber: number;
  existingNumbers: number[];
  latestChapterUnlockAt?: string | null;
  defaultCoinCost?: number | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [chapters, setChapters] = useState<PreparedChapterImport[]>([]);
  const [access, setAccess] = useState<"free" | "paid">("free");
  const [coinCost, setCoinCost] = useState(defaultCoinCost ?? 5);
  const [publish, setPublish] = useState(false);
  const [chaptersPerDay, setChaptersPerDay] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>(DEFAULT_RELEASE_WEEKDAYS);
  const [unlockAt, setUnlockAt] = useState(() =>
    latestChapterUnlockAt
      ? toDatetimeLocal(getSuggestedUnlockAt(latestChapterUnlockAt))
      : "",
  );

  const suggestedUnlockAt = useMemo(
    () => getSuggestedUnlockAt(latestChapterUnlockAt),
    [latestChapterUnlockAt],
  );
  const unlockAtDate = useMemo(() => {
    if (!unlockAt) return null;
    const d = new Date(unlockAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [unlockAt]);
  const unlockAtIso = unlockAtDate ? unlockAtDate.toISOString() : "";

  const scheduledUnlocks = useMemo(() => {
    if (!unlockAtDate || weekdays.length === 0) return [];
    return buildUnlockSchedule({
      startAt: unlockAtDate,
      weekdays,
      chaptersPerDay,
      count: chapters.length,
    });
  }, [unlockAtDate, weekdays, chaptersPerDay, chapters.length]);

  const orderedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.number - b.number),
    [chapters],
  );

  const lastUnlock = scheduledUnlocks[scheduledUnlocks.length - 1] ?? null;
  const unlockById = useMemo(() => {
    const map = new Map<string, Date>();
    orderedChapters.forEach((chapter, index) => {
      const date = scheduledUnlocks[index];
      if (date) map.set(chapter.id, date);
    });
    return map;
  }, [orderedChapters, scheduledUnlocks]);

  const busy = parsing || pending;
  const existing = useMemo(() => new Set(existingNumbers), [existingNumbers]);

  async function ingestFiles(fileList: File[]) {
    if (fileList.length === 0) return;
    setParsing(true);
    try {
      const result = await prepareChapterImports(
        fileList,
        nextChapterNumber,
        existing,
      );
      if (result.issues.length > 0) {
        const preview = result.issues
          .slice(0, 4)
          .map((issue) =>
            issue.path ? `${issue.path}: ${issue.message}` : issue.message,
          )
          .join("\n");
        toast.error(preview, {
          description:
            result.issues.length > 4
              ? `${result.issues.length - 4} more file${result.issues.length - 4 === 1 ? "" : "s"} skipped.`
              : undefined,
        });
      }
      if (result.chapters.length === 0) {
        if (result.issues.length === 0) {
          toast.error("No .txt, .md, .docx, or .pdf chapters found.");
        }
        return;
      }
      setChapters(result.chapters);
      toast.success(
        `Ready to upload ${result.chapters.length} chapter${result.chapters.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read those files.",
      );
    } finally {
      setParsing(false);
    }
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const files = await filesFromDataTransfer(event.dataTransfer);
    await ingestFiles(files);
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  }

  function updateChapter(id: string, patch: Partial<PreparedChapterImport>) {
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === id ? { ...chapter, ...patch } : chapter,
      ),
    );
  }

  function submit() {
    if (chapters.length === 0) {
      toast.error("Choose a folder, zip, or chapter files first.");
      return;
    }

    const numbers = chapters.map((chapter) => Math.floor(Number(chapter.number)));
    if (numbers.some((number) => !Number.isFinite(number) || number < 1)) {
      toast.error("Every chapter needs a number of 1 or higher.");
      return;
    }
    const duplicates = numbers.filter((number, index) => numbers.indexOf(number) !== index);
    if (duplicates.length > 0) {
      toast.error(`Chapter ${[...new Set(duplicates)].join(", ")} is listed more than once.`);
      return;
    }
    const taken = numbers.filter((number) => existing.has(number));
    if (taken.length > 0) {
      toast.error(`Chapter ${taken.join(", ")} already exist on this novel.`);
      return;
    }
    if (!chapters.every((chapter) => chapter.content.trim())) {
      toast.error("Every chapter needs content.");
      return;
    }

    if (access === "paid" && unlockAtIso && weekdays.length === 0) {
      toast.error("Pick at least one release day.");
      return;
    }

    const ordered = [...chapters].sort((a, b) => a.number - b.number);
    const dates =
      access === "paid" && unlockAtDate
        ? buildUnlockSchedule({
            startAt: unlockAtDate,
            weekdays,
            chaptersPerDay,
            count: ordered.length,
          })
        : [];
    const payload = ordered.map((chapter, index) => ({
      number: Math.floor(Number(chapter.number)),
      title: chapter.title.trim(),
      content: chapter.content,
      unlockAt: dates[index]?.toISOString() ?? null,
    }));

    startTransition(async () => {
      const result = await bulkCreateChapters(novelId, payload, {
        access,
        coinCost,
        publish,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <TabPanelShell
      leftTab={
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1 px-4 text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
          Back to chapters
        </Link>
      }
      rightTab={
        <button
          type="button"
          onClick={submit}
          disabled={busy || chapters.length === 0}
          className="inline-flex h-9 items-center justify-center px-4 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Uploading…"
            : chapters.length === 0
              ? "Upload chapters"
              : `Upload ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}`}
        </button>
      }
    >
      <div className="flex min-w-0 items-center gap-3 px-4 pt-2">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          Bulk upload chapters
        </h1>
      </div>

      <div className="grid items-start gap-4 px-4 pb-4 pt-2 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex flex-col gap-4">
          <div
            role="region"
            aria-label="Chapter file drop zone"
            aria-busy={parsing}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              setDragOver(false);
            }}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors ${
              dragOver
                ? "border-accent bg-accent/10"
                : "border-border bg-background"
            }`}
          >
            {parsing ? (
              <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
            ) : (
              <FolderUp className="size-8 text-accent" strokeWidth={1.5} aria-hidden />
            )}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">
                {parsing
                  ? "Reading files…"
                  : "Drop a folder, a .zip, or chapter files"}
              </p>
              <p className="text-xs text-muted">
                Accepts .txt, .md, .docx, and .pdf — up to {MAX_IMPORT_CHAPTERS}{" "}
                chapters. Formatting, paragraphs, and line breaks are kept.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                <Upload className="size-4" strokeWidth={1.75} aria-hidden />
                Choose files
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                <FolderUp className="size-4" strokeWidth={1.75} aria-hidden />
                Choose folder
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".txt,.md,.docx,.pdf,.zip,text/plain,text/markdown,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              disabled={busy}
              onChange={(event) => {
                const list = event.target.files ? [...event.target.files] : [];
                event.target.value = "";
                void ingestFiles(list);
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              className="sr-only"
              multiple
              // Non-standard, but the supported way to pick an unzipped folder.
              {...{ webkitdirectory: "", directory: "" }}
              disabled={busy}
              onChange={(event) => {
                const list = event.target.files ? [...event.target.files] : [];
                event.target.value = "";
                void ingestFiles(list);
              }}
            />
          </div>

          {chapters.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-muted">
                  {chapters.length} chapter{chapters.length === 1 ? "" : "s"} ready
                  <span className="mt-0.5 block font-normal">
                    Filename sets the number. &quot;Chapter 1.txt&quot; has no
                    title; &quot;Chapter 1 - The Storm.txt&quot; or
                    &quot;Chapter 1: The Storm.txt&quot; uses &quot;The Storm&quot;.
                  </span>
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setChapters([])}
                  className="text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              <div className="divide-y divide-border">
                {chapters.map((chapter) => {
                  const unlockDate = unlockById.get(chapter.id);
                  return (
                  <div key={chapter.id} className="flex flex-col gap-2 px-3 py-3">
                    <div className="flex items-start gap-3">
                      <label className="sr-only" htmlFor={`num-${chapter.id}`}>
                        Chapter number for {chapter.path}
                      </label>
                      <input
                        id={`num-${chapter.id}`}
                        type="number"
                        min={1}
                        value={chapter.number}
                        disabled={busy}
                        onChange={(event) =>
                          updateChapter(chapter.id, {
                            number: Number(event.target.value),
                          })
                        }
                        className={`${inputClass} h-9 w-20 shrink-0`}
                      />
                      <label className="sr-only" htmlFor={`title-${chapter.id}`}>
                        Title for {chapter.path}
                      </label>
                      <input
                        id={`title-${chapter.id}`}
                        value={chapter.title}
                        disabled={busy}
                        placeholder="Title (optional)"
                        onChange={(event) =>
                          updateChapter(chapter.id, { title: event.target.value })
                        }
                        className={`${inputClass} h-9 min-w-0 flex-1`}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        title="Remove"
                        onClick={() =>
                          setChapters((current) =>
                            current.filter((row) => row.id !== chapter.id),
                          )
                        }
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                      </button>
                    </div>
                    <p className="truncate pl-[5.5rem] text-xs text-muted">
                      File: {chapter.path}
                      <span aria-hidden> · </span>
                      {chapter.wordCount.toLocaleString()} word
                      {chapter.wordCount === 1 ? "" : "s"}
                      {access === "paid" && unlockDate ? (
                        <>
                          <span aria-hidden> · </span>
                          {formatUnlockChip(unlockDate)}
                        </>
                      ) : null}
                    </p>
                    {chapter.warning ? (
                      <p className="pl-[5.5rem] text-xs text-amber-700 dark:text-amber-400">
                        {chapter.warning}
                      </p>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>Access</legend>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
                <input
                  type="radio"
                  name="bulk-access"
                  value="free"
                  checked={access === "free"}
                  onChange={() => setAccess("free")}
                  className="size-3.5 accent-accent"
                />
                Free
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
                <input
                  type="radio"
                  name="bulk-access"
                  value="paid"
                  checked={access === "paid"}
                  onChange={() => setAccess("paid")}
                  className="size-3.5 accent-accent"
                />
                Paid
              </label>
            </div>
          </fieldset>

          {access === "paid" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bulk-cost" className={labelClass}>
                  Cookie cost
                </label>
                <input
                  id="bulk-cost"
                  name="coinCost"
                  type="number"
                  min={1}
                  value={coinCost}
                  onChange={(event) =>
                    setCoinCost(Math.floor(Number(event.target.value) || 0))
                  }
                  className={`${inputClass} w-28`}
                />
                <span className="text-xs text-muted">
                  Applied to every chapter in this upload.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="bulk-unlock" className={labelClass}>
                  First auto-unlock
                  <span className="ml-1 font-normal opacity-60">(optional)</span>
                </label>
                <input
                  id="bulk-unlock"
                  type="datetime-local"
                  value={unlockAt}
                  onChange={(event) => setUnlockAt(event.target.value)}
                  className={inputClass}
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setUnlockAt(toDatetimeLocal(suggestedUnlockAt))}
                  className="inline-flex h-10 w-fit shrink-0 items-center rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Use next day
                </button>
                <span className="text-xs text-muted" suppressHydrationWarning>
                  Next day sets {formatSuggestedUnlockPreview(suggestedUnlockAt)}.
                  If that date isn&apos;t a selected weekday, the schedule
                  starts on the next one, at the same time.
                </span>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className={labelClass}>Release days</legend>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const checked = weekdays.includes(day.value);
                    return (
                      <label
                        key={day.value}
                        className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWeekday(day.value)}
                          className="sr-only"
                        />
                        {day.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="bulk-per-day" className={labelClass}>
                  Chapters per release day
                </label>
                <input
                  id="bulk-per-day"
                  type="number"
                  min={1}
                  max={50}
                  value={chaptersPerDay}
                  onChange={(event) =>
                    setChaptersPerDay(
                      Math.max(1, Math.min(50, Math.floor(Number(event.target.value) || 1))),
                    )
                  }
                  className={`${inputClass} w-28`}
                />
                <span className="text-xs text-muted">
                  {weekdays.length === 0
                    ? "Pick at least one weekday."
                    : lastUnlock
                      ? `${chaptersPerDay} chapter${chaptersPerDay === 1 ? "" : "s"} each ${weekdayLabels(weekdays)}. Last unlock ${formatSuggestedUnlockPreview(lastUnlock)}.`
                      : `${chaptersPerDay} chapter${chaptersPerDay === 1 ? "" : "s"} each ${weekdayLabels(weekdays)}. Set a first auto-unlock date to preview the schedule.`}
                </span>
              </div>
            </>
          ) : null}

          <label className="inline-flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={publish}
              onChange={(event) => setPublish(event.target.checked)}
              className="mt-0.5 size-3.5 accent-accent"
            />
            <span>
              Publish immediately
              <span className="mt-0.5 block text-xs font-normal text-muted">
                Leave unchecked to save drafts you can review first.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={busy || chapters.length === 0}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Uploading…"
              : chapters.length === 0
                ? "Upload chapters"
                : `Upload ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}`}
          </button>
        </aside>
      </div>
    </TabPanelShell>
  );
}
