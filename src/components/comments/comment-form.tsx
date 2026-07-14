"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, LogIn, MessageSquare } from "lucide-react";

import { createComment } from "@/app/(main)/novels/actions";
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
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chapterMenuRef = useRef<HTMLDivElement>(null);

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
      const result = await createComment(novelSlug, body, chapter);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      setSelectedChapter("");
      if (result.comment) {
        onCommentCreated?.(result.comment);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <label htmlFor="comment-body" className="sr-only">
        Write a comment
      </label>
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
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-center">
          {isLoggedIn && mode === "novel" && readableChapters.length > 0 ? (
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
              <div ref={chapterMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setChapterMenuOpen((open) => !open)}
                  disabled={pending}
                  aria-haspopup="menu"
                  aria-expanded={chapterMenuOpen}
                  aria-label="Comment scope"
                  className="inline-flex h-9 w-24 max-w-full items-center justify-between gap-1 rounded-xl px-2 text-sm font-medium leading-none text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                >
                  <span className="truncate">
                    {selectedChapter ? selectedChapter : "General"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 transition-transform duration-150",
                      chapterMenuOpen && "rotate-180",
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>

                {chapterMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-30 mt-1.5 max-h-64 w-24 overflow-y-auto rounded-xl border border-border bg-surface shadow-md"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSelectedChapter("");
                        setChapterMenuOpen(false);
                      }}
                      className="flex w-full items-center px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-background"
                    >
                      General
                    </button>
                    {readableChapters.map((chapter) => (
                      <button
                        key={chapter.number}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSelectedChapter(String(chapter.number));
                          setChapterMenuOpen(false);
                        }}
                        className="flex w-full items-center px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-background"
                      >
                        {chapter.number}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {isLoggedIn ? (
            <span className="text-xs text-muted">
              {body.length}/{MAX_COMMENT_LENGTH}
            </span>
          ) : null}
        </div>

        {isLoggedIn ? (
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageSquare className="size-4" strokeWidth={1.75} aria-hidden />
            {pending ? "Posting…" : "Post comment"}
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <LogIn className="size-4" strokeWidth={1.75} aria-hidden />
            Sign in to comment
          </Link>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
