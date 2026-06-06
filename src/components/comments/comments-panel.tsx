"use client";

import { useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";

import { loadMoreComments } from "@/app/(main)/novels/actions";
import type { ReadableChapter } from "@/lib/data";
import type { NovelComment } from "@/types";

import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

export function CommentsPanel({
  mode,
  novelSlug,
  initialComments,
  initialHasMore,
  isLoggedIn,
  chapterNumber,
  readableChapters = [],
  chapterTitles,
}: {
  mode: "novel" | "chapter";
  novelSlug: string;
  initialComments: NovelComment[];
  initialHasMore: boolean;
  isLoggedIn: boolean;
  chapterNumber?: number;
  readableChapters?: ReadableChapter[];
  chapterTitles: Record<number, string>;
}) {
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLoadMore() {
    setError(null);
    startTransition(async () => {
      const result = await loadMoreComments(novelSlug, comments.length);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.comments) {
        setComments((prev) => [...prev, ...result.comments!]);
      }
      setHasMore(Boolean(result.hasMore));
    });
  }

  return (
    <div className="space-y-4">
      <CommentForm
        novelSlug={novelSlug}
        isLoggedIn={isLoggedIn}
        mode={mode}
        chapterNumber={chapterNumber}
        readableChapters={readableChapters}
        onCommentCreated={(comment) =>
          setComments((prev) => [comment, ...prev])
        }
      />

      {comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                isLoggedIn={isLoggedIn}
                mode={mode}
                chapterTitles={chapterTitles}
                onDeleted={(id) =>
                  setComments((prev) => prev.filter((c) => c.id !== id))
                }
                onUpdated={(id, body) =>
                  setComments((prev) =>
                    prev.map((c) =>
                      c.id === id
                        ? { ...c, body, updatedAt: new Date().toISOString() }
                        : c,
                    ),
                  )
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <MessageSquare
            className="mx-auto size-8 text-muted"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-3 text-sm text-muted">
            No comments yet. Be the first to share your thoughts.
          </p>
        </div>
      )}

      {mode === "novel" && hasMore ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
          >
            {pending ? "Loading…" : "Load more comments"}
          </button>
          {error ? (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
