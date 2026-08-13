"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, LogIn, Star } from "lucide-react";

import { createComment } from "@/app/(main)/novels/actions";
import { TabPanelShell } from "@/components/tab-panel-shell";
import { cn } from "@/lib/utils";
import type { ReadableChapter } from "@/lib/data";
import type { NovelComment } from "@/types";

const MAX_COMMENT_LENGTH = 2000;

export function CommentForm({
  novelSlug,
  isLoggedIn,
  mode,
  chapterNumber,
  readableChapters = [],
  onCommentCreated,
}: {
  novelSlug: string;
  isLoggedIn: boolean;
  mode: "novel" | "chapter";
  chapterNumber?: number;
  readableChapters?: ReadableChapter[];
  onCommentCreated?: (comment: NovelComment) => void;
}) {
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chapterMenuRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [menuHeight, setMenuHeight] = useState(0);
  const canRate = mode === "novel" && !selectedChapter;

  useLayoutEffect(() => {
    const form = formRef.current;
    const tab = chapterMenuRef.current;
    if (!form) return;
    const measure = () => {
      setMenuHeight(Math.max(0, form.offsetHeight - (tab?.offsetHeight ?? 0)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(form);
    if (tab) ro.observe(tab);
    return () => ro.disconnect();
  }, [isLoggedIn, mode, readableChapters.length]);

  useEffect(() => {
    if (!chapterMenuOpen) return;
    function onClickOutside(event: MouseEvent) {
      if (
        chapterMenuRef.current &&
        !chapterMenuRef.current.contains(event.target as Node)
      ) {
        setChapterMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setChapterMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [chapterMenuOpen]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const chapter =
      mode === "chapter"
        ? chapterNumber
        : selectedChapter
          ? Number(selectedChapter)
          : null;

    startTransition(async () => {
      const result = await createComment(
        novelSlug,
        body,
        chapter,
        canRate ? rating : null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      setRating(null);
      setSelectedChapter("");
      if (result.comment) {
        onCommentCreated?.(result.comment);
      }
    });
  }

  const titleTab = (
    <h2 className="flex h-9 items-center px-4 text-sm font-semibold tracking-tight text-foreground">
      Post comment
    </h2>
  );

  const postTab = isLoggedIn ? (
    <button
      type="submit"
      disabled={pending || !body.trim()}
      className="inline-flex h-9 items-center justify-center px-4 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Posting…" : "Post"}
    </button>
  ) : (
    <Link
      href="/login"
      className="inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <LogIn className="size-4" strokeWidth={1.75} aria-hidden />
      Sign in to comment
    </Link>
  );

  const ratingTab =
    isLoggedIn && canRate ? (
      <div
        className="flex h-9 items-center gap-0.5 px-3"
        role="radiogroup"
        aria-label="Optional rating"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            disabled={pending}
            onClick={() =>
              setRating((current) => (current === star ? null : star))
            }
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
          >
            <Star
              className={
                rating != null && star <= rating
                  ? "size-4 fill-amber-500 text-amber-500"
                  : "size-4 text-border"
              }
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
        ))}
      </div>
    ) : undefined;

  const showChapterSelector =
    isLoggedIn && mode === "novel" && readableChapters.length > 0;
  const scopeLabel = selectedChapter ? `Ch. ${selectedChapter}` : "General";

  const chapterSelector = showChapterSelector ? (
    <div ref={chapterMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setChapterMenuOpen((open) => !open)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={chapterMenuOpen}
        aria-label={`Commenting on ${scopeLabel}`}
        className="inline-flex h-9 max-w-full items-center gap-1.5 px-3.5 text-sm font-medium leading-none text-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        <span className="truncate">{scopeLabel}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted transition-transform duration-150",
            chapterMenuOpen && "rotate-180",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {chapterMenuOpen ? (
        <div
          role="menu"
          style={menuHeight ? { height: menuHeight } : undefined}
          className="absolute bottom-full left-0 z-30 w-full overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface shadow-md [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setSelectedChapter("");
              setChapterMenuOpen(false);
            }}
            className="flex w-full items-center justify-between gap-1.5 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <span className="min-w-0 truncate">General</span>
            {!selectedChapter ? (
              <Check className="size-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
            ) : null}
          </button>
          {readableChapters.map((chapter) => {
            const isSelected = selectedChapter === String(chapter.number);
            return (
              <button
                key={chapter.number}
                type="button"
                role="menuitem"
                onClick={() => {
                  setSelectedChapter(String(chapter.number));
                  setRating(null);
                  setChapterMenuOpen(false);
                }}
                className="flex w-full items-center justify-between gap-1.5 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <span className="min-w-0 truncate">Ch. {chapter.number}</span>
                {isSelected ? (
                  <Check className="size-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <TabPanelShell
        leftTab={titleTab}
        rightTab={ratingTab}
        bottomLeftTab={chapterSelector ?? undefined}
        bottomRightTab={postTab}
      >
        <div className="px-4 pb-4 pt-3">
          <label htmlFor="comment-body" className="sr-only">
            Write a comment
          </label>
          <div className="relative">
            <textarea
              id="comment-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                isLoggedIn ? "Share your thoughts…" : "Sign in to leave a comment"
              }
              rows={3}
              maxLength={MAX_COMMENT_LENGTH}
              disabled={!isLoggedIn || pending}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 pb-6 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isLoggedIn ? (
              <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted">
                {body.length}/{MAX_COMMENT_LENGTH}
              </span>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-2 text-xs text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          ) : null}
        </div>
      </TabPanelShell>
    </form>
  );
}
