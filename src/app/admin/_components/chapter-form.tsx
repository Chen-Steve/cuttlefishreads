"use client";

import { useActionState, useMemo, useState } from "react";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  formatSuggestedUnlockPreview,
  getSuggestedUnlockAt,
} from "@/lib/suggested-unlock-at";
import { createChapter, updateChapter, type AdminState } from "../actions";

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

export type ChapterFormInitial = {
  chapterId: string;
  number: number;
  title: string;
  content: string;
  translatorNote: string | null;
  useGlobalTranslatorNote: boolean;
  isFree: boolean;
  coinCost: number;
  unlockAt: string | null;
};

export function ChapterForm({
  novelId,
  initial,
  latestChapterUnlockAt = null,
  defaultCoinCost = null,
  nextChapterNumber = null,
}: {
  novelId: string;
  initial?: ChapterFormInitial;
  latestChapterUnlockAt?: string | null;
  /** Cookie cost of the most recent paid chapter, reused as the default. */
  defaultCoinCost?: number | null;
  /** Next chapter number for new chapters, shown instead of "Auto". */
  nextChapterNumber?: number | null;
}) {
  const isEdit = Boolean(initial);

  const boundAction = isEdit
    ? updateChapter.bind(null, initial!.chapterId)
    : createChapter;

  const [state, action, pending] = useActionState<AdminState, FormData>(
    boundAction,
    {},
  );

  const [access, setAccess] = useState<"free" | "paid">(
    initial && !initial.isFree ? "paid" : "free",
  );
  const [noteMode, setNoteMode] = useState<"global" | "unique">(
    initial?.useGlobalTranslatorNote === false ? "unique" : "global",
  );
  // New chapters continue from the previous chapter's schedule so the date
  // picker opens on the right month instead of resetting to today.
  const [unlockAt, setUnlockAt] = useState(() => {
    if (initial) return toDatetimeLocal(initial.unlockAt);
    if (latestChapterUnlockAt) {
      return toDatetimeLocal(getSuggestedUnlockAt(latestChapterUnlockAt));
    }
    return "";
  });

  // The datetime-local value has no timezone, so convert it to UTC here in
  // the browser — the server's timezone must never reinterpret it.
  const unlockAtIso = useMemo(() => {
    if (!unlockAt) return "";
    const d = new Date(unlockAt);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }, [unlockAt]);

  const suggestedUnlockAt = useMemo(
    () => getSuggestedUnlockAt(latestChapterUnlockAt),
    [latestChapterUnlockAt],
  );
  const suggestedUnlockLabel = useMemo(
    () => formatSuggestedUnlockPreview(suggestedUnlockAt),
    [suggestedUnlockAt],
  );
  const previousUnlockLabel = useMemo(() => {
    if (!latestChapterUnlockAt) return null;
    const d = new Date(latestChapterUnlockAt);
    return Number.isNaN(d.getTime())
      ? null
      : formatSuggestedUnlockPreview(d);
  }, [latestChapterUnlockAt]);

  function applySuggestedUnlockDate() {
    setUnlockAt(toDatetimeLocal(suggestedUnlockAt));
  }

  const submitLabel = pending
    ? isEdit
      ? "Saving…"
      : "Publishing…"
    : isEdit
      ? "Save changes"
      : "Publish chapter";

  const submitButtonClass =
    "inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

  const cardClass =
    "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6";

  return (
    <form action={action} className="flex flex-col gap-4">
      {isEdit && (
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Edit chapter {initial!.number}
          </h1>
          <button
            type="submit"
            disabled={pending}
            className={submitButtonClass}
          >
            {submitLabel}
          </button>
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <input type="hidden" name="novelId" value={novelId} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        {/* Main column: writing */}
        <div className={cardClass}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapter-title" className={labelClass}>
              Chapter title
              <span className="ml-1 font-normal opacity-60">(optional)</span>
            </label>
            <input
              id="chapter-title"
              name="title"
              defaultValue={initial?.title ?? ""}
              placeholder="Salt and Lamplight"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapter-content" className={labelClass}>
              Content
            </label>
            <RichTextEditor
              id="chapter-content"
              name="content"
              defaultValue={initial?.content ?? ""}
              placeholder="Write the chapter here."
              className="min-h-[24rem]"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>
              Translator&apos;s note
              <span className="ml-1 font-normal opacity-60">(optional)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
                <input
                  type="radio"
                  name="noteMode"
                  value="global"
                  checked={noteMode === "global"}
                  onChange={() => setNoteMode("global")}
                  className="size-3.5 accent-accent"
                />
                Use global message
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
                <input
                  type="radio"
                  name="noteMode"
                  value="unique"
                  checked={noteMode === "unique"}
                  onChange={() => setNoteMode("unique")}
                  className="size-3.5 accent-accent"
                />
                Write unique message
              </label>
            </div>
            {noteMode === "global" ? (
              <span className="text-xs text-muted">
                Uses the global message from workspace Settings, with your
                Ko-fi / Patreon links.
              </span>
            ) : (
              <div className="flex flex-col gap-1.5">
                <RichTextEditor
                  id="chapter-note"
                  name="translatorNote"
                  defaultValue={initial?.translatorNote ?? ""}
                  placeholder="A short message just for this chapter."
                  className="min-h-[6.5rem]"
                />
                <span className="text-xs text-muted">
                  Shown above the comments on this chapter only.
                </span>
              </div>
            )}
          </fieldset>
        </div>

        {/* Sidebar: publishing options, sticky so they're always in reach */}
        <aside className={`${cardClass} lg:sticky lg:top-6`}>
          <h2 className="text-sm font-semibold text-foreground">Publishing</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapter-number" className={labelClass}>
              Chapter #
            </label>
            <input
              id="chapter-number"
              name="number"
              type="number"
              min={1}
              defaultValue={initial?.number ?? nextChapterNumber ?? ""}
              placeholder="Auto"
              className={`${inputClass} w-28`}
            />
            {!isEdit && nextChapterNumber !== null && (
              <span className="text-xs text-muted">
                Next in sequence — change it to insert elsewhere.
              </span>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>Access</legend>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
                <input
                  type="radio"
                  name="access"
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
                  name="access"
                  value="paid"
                  checked={access === "paid"}
                  onChange={() => setAccess("paid")}
                  className="size-3.5 accent-accent"
                />
                Paid (unlock with cookies)
              </label>
            </div>
          </fieldset>

          {access === "paid" && (
            <>
              <input type="hidden" name="unlockAt" value={unlockAtIso} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="chapter-cost" className={labelClass}>
                  Cookie cost
                </label>
                <input
                  id="chapter-cost"
                  name="coinCost"
                  type="number"
                  min={1}
                  defaultValue={initial?.coinCost ?? defaultCoinCost ?? 5}
                  className={`${inputClass} w-28`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="chapter-unlock" className={labelClass}>
                  Auto-unlock date
                  <span className="ml-1 font-normal opacity-60">
                    (optional)
                  </span>
                </label>
                {previousUnlockLabel && (
                  <span
                    className="text-xs text-muted"
                    suppressHydrationWarning
                  >
                    Latest scheduled chapter: {previousUnlockLabel}
                  </span>
                )}
                <input
                  id="chapter-unlock"
                  type="datetime-local"
                  value={unlockAt}
                  onChange={(event) => setUnlockAt(event.target.value)}
                  className={inputClass}
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={applySuggestedUnlockDate}
                  className="inline-flex h-10 w-fit shrink-0 items-center rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Use next day
                </button>
                <span className="text-xs text-muted" suppressHydrationWarning>
                  {!isEdit && latestChapterUnlockAt
                    ? "Pre-filled one day after the latest scheduled chapter, at the same time — adjust or clear it if this chapter shouldn't auto-unlock."
                    : latestChapterUnlockAt
                      ? `Next day sets ${suggestedUnlockLabel} — one day after the latest scheduled chapter.`
                      : `Next day sets ${suggestedUnlockLabel}.`}{" "}
                  A paid chapter becomes free for everyone once this date
                  passes.
                </span>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={pending}
            className={`${submitButtonClass} w-full`}
          >
            {submitLabel}
          </button>
        </aside>
      </div>
    </form>
  );
}
