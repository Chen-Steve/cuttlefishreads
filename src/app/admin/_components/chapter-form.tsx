"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Bold, Italic, Pilcrow } from "lucide-react";

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
}: {
  novelId: string;
  initial?: ChapterFormInitial;
  latestChapterUnlockAt?: string | null;
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
  const [unlockAt, setUnlockAt] = useState(() =>
    toDatetimeLocal(initial?.unlockAt ?? null),
  );
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const suggestedUnlockAt = useMemo(
    () => getSuggestedUnlockAt(latestChapterUnlockAt),
    [latestChapterUnlockAt],
  );
  const suggestedUnlockLabel = useMemo(
    () => formatSuggestedUnlockPreview(suggestedUnlockAt),
    [suggestedUnlockAt],
  );

  function applySuggestedUnlockDate() {
    setUnlockAt(toDatetimeLocal(suggestedUnlockAt));
  }

  function wrapSelection(before: string, after: string) {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    el.value =
      value.slice(0, start) + before + selected + after + value.slice(end);
    const cursor = start + before.length + selected.length;
    el.focus();
    el.setSelectionRange(cursor, cursor);
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600"
        >
          {state.error}
        </p>
      )}

      <input type="hidden" name="novelId" value={novelId} />

      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col gap-1.5">
          <label htmlFor="chapter-number" className={labelClass}>
            Chapter #
          </label>
          <input
            id="chapter-number"
            name="number"
            type="number"
            min={1}
            defaultValue={initial?.number ?? ""}
            placeholder="Auto"
            className="h-11 w-24 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="chapter-content" className={labelClass}>
          Content
        </label>
        <div className="overflow-hidden rounded-xl border border-border bg-background focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            <button
              type="button"
              onClick={() => wrapSelection("**", "**")}
              title="Bold"
              aria-label="Bold"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <Bold className="size-4" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("_", "_")}
              title="Italic"
              aria-label="Italic"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <Italic className="size-4" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("\n\n", "")}
              title="New paragraph"
              aria-label="New paragraph"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <Pilcrow className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          <textarea
            id="chapter-content"
            name="content"
            ref={contentRef}
            required
            rows={16}
            defaultValue={initial?.content ?? ""}
            placeholder="Write the chapter here. Separate paragraphs with a blank line."
            className="block w-full resize-y bg-transparent px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted/70"
          />
        </div>
        <span className="text-xs text-muted">
          Blank lines start new paragraphs. **bold** and _italic_ are supported.
        </span>
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
            Uses the global message from workspace Settings, with your Ko-fi /
            Patreon links.
          </span>
        ) : (
          <div className="flex flex-col gap-1.5">
            <textarea
              id="chapter-note"
              name="translatorNote"
              rows={4}
              defaultValue={initial?.translatorNote ?? ""}
              placeholder="A short message just for this chapter."
              className="block w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <span className="text-xs text-muted">
              Shown above the comments on this chapter only. **bold** and _italic_
              are supported.
            </span>
          </div>
        )}
      </fieldset>

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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapter-cost" className={labelClass}>
              Cookie cost
            </label>
            <input
              id="chapter-cost"
              name="coinCost"
              type="number"
              min={1}
              defaultValue={initial?.coinCost ?? 5}
              className={`${inputClass} sm:w-44`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapter-unlock" className={labelClass}>
              Auto-unlock date
              <span className="ml-1 font-normal opacity-60">(optional)</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="chapter-unlock"
                name="unlockAt"
                type="datetime-local"
                value={unlockAt}
                onChange={(event) => setUnlockAt(event.target.value)}
                className={`${inputClass} sm:w-72`}
              />
              <button
                type="button"
                onClick={applySuggestedUnlockDate}
                className="inline-flex h-11 shrink-0 items-center rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Use next day
              </button>
            </div>
            <span className="text-xs text-muted">
              {latestChapterUnlockAt
                ? `Next day sets ${suggestedUnlockLabel} — one day after the latest scheduled chapter.`
                : `Next day sets ${suggestedUnlockLabel}.`}
              {" "}A paid chapter becomes free for everyone once this date passes.
            </span>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
      >
        {pending
          ? isEdit ? "Saving…" : "Publishing…"
          : isEdit ? "Save changes" : "Publish chapter"}
      </button>
    </form>
  );
}
