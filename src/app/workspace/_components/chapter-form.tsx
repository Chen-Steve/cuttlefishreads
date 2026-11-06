"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TabPanelShell } from "@/components/tab-panel-shell";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { countChapterWords } from "@/lib/chapter-words";
import {
  formatSuggestedUnlockPreview,
  getSuggestedUnlockAt,
  toDatetimeLocal,
} from "@/lib/suggested-unlock-at";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { createChapter, updateChapter, type AdminState } from "../actions";
import { ChapterEditorPreview } from "./chapter-editor-preview";
import { ConfirmDialog } from "./confirm-dialog";

const OPTIONS_OPEN_KEY = "cf-chapter-editor-options";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";

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
  isPublished: boolean;
};

export type ChapterSibling = {
  id: string;
  number: number;
};

function chapterEditHref(
  base: string,
  novelId: string,
  chapterId: string,
) {
  return `${base}/novels/${novelId}/chapters/${chapterId}/edit`;
}

function ChapterSiblingNav({
  novelId,
  base,
  previous,
  next,
}: {
  novelId: string;
  base: string;
  previous?: ChapterSibling | null;
  next?: ChapterSibling | null;
}) {
  const previousHref = previous
    ? chapterEditHref(base, novelId, previous.id)
    : undefined;
  const nextHref = next
    ? chapterEditHref(base, novelId, next.id)
    : undefined;

  const linkClass =
    "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-background hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const disabledClass =
    "inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-muted opacity-40";

  const previousLabel = previous
    ? `Previous chapter (Ch. ${previous.number})`
    : "Previous chapter";
  const nextLabel = next
    ? `Next chapter (Ch. ${next.number})`
    : "Next chapter";

  return (
    <nav
      aria-label="Chapter navigation"
      className="ml-auto flex shrink-0 items-center"
    >
      <SiblingNavItem
        href={previousHref}
        label={previousLabel}
        linkClass={linkClass}
        disabledClass={disabledClass}
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Prev</span>
      </SiblingNavItem>
      <SiblingNavItem
        href={nextHref}
        label={nextLabel}
        linkClass={linkClass}
        disabledClass={disabledClass}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
      </SiblingNavItem>
    </nav>
  );
}

function SiblingNavItem({
  href,
  label,
  linkClass,
  disabledClass,
  children,
}: {
  href?: string;
  label: string;
  linkClass: string;
  disabledClass: string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={linkClass} title={label} aria-label={label}>
        {children}
      </Link>
    );
  }

  return (
    <span className={disabledClass} aria-disabled="true" title={label}>
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ChapterForm({
  novelId,
  initial,
  latestChapterUnlockAt = null,
  defaultCoinCost = null,
  nextChapterNumber = null,
  previousChapter = null,
  nextChapter = null,
}: {
  novelId: string;
  initial?: ChapterFormInitial;
  latestChapterUnlockAt?: string | null;
  /** Cookie cost of the most recent paid chapter, reused as the default. */
  defaultCoinCost?: number | null;
  /** Next chapter number for new chapters, shown instead of "Auto". */
  nextChapterNumber?: number | null;
  previousChapter?: ChapterSibling | null;
  nextChapter?: ChapterSibling | null;
}) {
  const isEdit = Boolean(initial);
  const base = WORKSPACE_BASE;
  const formRef = useRef<HTMLFormElement>(null);
  const readyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [preview, setPreview] = useState(() => ({
    content: initial?.content ?? "",
    words: countChapterWords(initial?.content ?? ""),
  }));
  const unsaved = useUnsavedChanges(dirty);

  const boundAction = isEdit
    ? updateChapter.bind(null, initial!.chapterId)
    : createChapter;

  const [state, action, pending] = useActionState<AdminState, FormData>(
    boundAction,
    {},
  );
  const wasPending = useRef(false);
  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Stay on the edit page and report save results with a toast.
  useEffect(() => {
    if (!isEdit) return;
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;

    if (state.error) {
      toast.error(state.error);
      return;
    }
    if (state.success) {
      toast.success(state.success);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear unsaved after a completed save
      setDirty(false);
    }
  }, [isEdit, pending, state.error, state.success]);

  useEffect(() => {
    readyRef.current = true;
    if (localStorage.getItem(OPTIONS_OPEN_KEY) === "closed") {
      setOptionsOpen(false);
    }
  }, []);

  function toggleOptions() {
    setOptionsOpen((open) => {
      const next = !open;
      localStorage.setItem(OPTIONS_OPEN_KEY, next ? "open" : "closed");
      return next;
    });
  }

  function markDirty() {
    if (readyRef.current) setDirty(true);
  }

  function onSubmit() {
    unsaved.cancelLeave();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (!pendingRef.current) formRef.current?.requestSubmit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function readContentMarkdown(): string {
    const field = formRef.current?.elements.namedItem("content");
    return field instanceof HTMLInputElement ? field.value : "";
  }

  function showPreview() {
    const content = readContentMarkdown();
    setPreview({ content, words: countChapterWords(content) });
    setEditorMode("preview");
  }

  function confirmLeave() {
    setDirty(false);
    unsaved.confirmLeave();
  }

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
    const next = toDatetimeLocal(suggestedUnlockAt);
    if (next !== unlockAt) setDirty(true);
    setUnlockAt(next);
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

  const cardClass = "flex flex-col gap-4";

  return (
    <>
    <form
      ref={formRef}
      action={action}
      onInput={markDirty}
      onChange={markDirty}
      onSubmit={onSubmit}
    >
      <TabPanelShell
        leftTab={
          <Link
            href={`${base}/novels/${novelId}/chapters`}
            className="inline-flex h-9 items-center gap-1 px-4 text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
            Back to chapters
          </Link>
        }
        rightTab={
          <button
            type="submit"
            disabled={pending}
            title="Save (Ctrl+S)"
            className="inline-flex h-9 items-center justify-center px-4 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        }
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-2">
          <h1 className="shrink-0 text-sm font-semibold tracking-tight text-foreground">
            {isEdit ? `Edit chapter ${initial!.number}` : "Add chapter"}
          </h1>
          {dirty ? (
            <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">
              Unsaved
            </span>
          ) : null}
          <label htmlFor="chapter-title" className="sr-only">
            Chapter title (optional)
          </label>
          <input
            id="chapter-title"
            name="title"
            defaultValue={initial?.title ?? ""}
            placeholder="Chapter title (optional)"
            className={`${inputClass} h-9 min-w-0 flex-1`}
          />
          {isEdit ? (
            <ChapterSiblingNav
              novelId={novelId}
              base={base}
              previous={previousChapter}
              next={nextChapter}
            />
          ) : null}
        </div>

        {!isEdit && state.error ? (
          <p
            role="alert"
            className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </p>
        ) : null}

        <input type="hidden" name="novelId" value={novelId} />

        <div
          className={`grid items-start gap-4 px-4 pb-4 pt-2 ${optionsOpen ? "lg:grid-cols-[minmax(0,1fr)_16rem]" : ""}`}
        >
          {/* Main column: writing */}
          <div className={cardClass}>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    role="tablist"
                    aria-label="Editor mode"
                    className="flex items-center rounded-lg border border-border bg-background p-0.5"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorMode === "write"}
                      onClick={() => setEditorMode("write")}
                      className={
                        editorMode === "write"
                          ? "rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-foreground"
                          : "rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
                      }
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorMode === "preview"}
                      onClick={showPreview}
                      className={
                        editorMode === "preview"
                          ? "rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-foreground"
                          : "rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
                      }
                    >
                      Preview
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={toggleOptions}
                    aria-expanded={optionsOpen}
                    aria-controls="chapter-options"
                    title={optionsOpen ? "Hide options" : "Show options"}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {optionsOpen ? (
                      <PanelRightClose className="size-4" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <PanelRightOpen className="size-4" strokeWidth={1.75} aria-hidden />
                    )}
                    <span className="sr-only">
                      {optionsOpen ? "Hide options" : "Show options"}
                    </span>
                  </button>
                </div>
              </div>
              <div
                className={editorMode === "write" ? undefined : "hidden"}
                inert={editorMode === "preview" ? true : undefined}
              >
                <RichTextEditor
                  id="chapter-content"
                  name="content"
                  defaultValue={initial?.content ?? ""}
                  placeholder="Write the chapter here."
                  className="min-h-[24rem] max-h-[min(70dvh,48rem)] lg:max-h-[calc(100dvh-11rem)]"
                  enableFootnotes
                  showWordCount
                />
              </div>
              {editorMode === "preview" ? (
                <div className="flex min-h-[24rem] max-h-[min(70dvh,48rem)] flex-col overflow-hidden rounded-xl border border-border bg-background lg:max-h-[calc(100dvh-11rem)]">
                  <div className="flex shrink-0 items-center justify-end border-b border-border px-3 py-1.5">
                    <span className="text-xs tabular-nums text-muted">
                      {preview.words.toLocaleString()} word
                      {preview.words === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <ChapterEditorPreview content={preview.content} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Sidebar: publishing options, sticky so they're always in reach */}
          <aside
            id="chapter-options"
            className={`${cardClass} lg:sticky lg:top-6 ${optionsOpen ? "" : "hidden"}`}
          >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapter-number" className="sr-only">
              Chapter #
            </label>
            <input
              id="chapter-number"
              name="number"
              type="number"
              min={1}
              defaultValue={initial?.number ?? nextChapterNumber ?? ""}
              placeholder="Chapter #"
              className={`${inputClass} w-full`}
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
                  Paid
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
                </span>
              </div>
            </>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>
              Translator&apos;s note
              <span className="ml-1 font-normal opacity-60">(optional)</span>
            </legend>
            <div className="flex flex-col gap-2">
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
                Global message can be changed from workspace Settings.
              </span>
            ) : null}
            <div
              className={noteMode === "unique" ? "flex flex-col gap-1.5" : "hidden"}
              inert={noteMode === "global" ? true : undefined}
            >
              <RichTextEditor
                id="chapter-note"
                name="translatorNote"
                defaultValue={initial?.translatorNote ?? ""}
                placeholder="A short message just for this chapter."
                className="min-h-[10rem]"
              />
              <span className="text-xs text-muted">
                Shown above the comments on this chapter only.
              </span>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            title="Save (Ctrl+S)"
            className={`${submitButtonClass} w-full`}
          >
            {submitLabel}
          </button>
        </aside>
        </div>
      </TabPanelShell>
    </form>
    <ConfirmDialog
      open={unsaved.leaveOpen}
      title="Unsaved changes"
      confirmLabel="Leave"
      cancelLabel="Keep editing"
      intent="accent"
      onCancel={unsaved.cancelLeave}
      onConfirm={confirmLeave}
    >
      Leave this chapter? Your latest edits have not been saved.
    </ConfirmDialog>
    </>
  );
}
