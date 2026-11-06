"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";

import { loadMoreComments, loadCommentTarget } from "@/app/(main)/novels/actions";
import type { ReadableChapter } from "@/lib/data";
import type { NovelComment } from "@/types";
import { mergeCommentPages, type CommentCursor } from "@/lib/comment-pagination";

import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

export function CommentsPanel({
  mode,
  novelSlug,
  initialComments,
  initialHasMore,
  initialCursor,
  isLoggedIn,
  chapterNumber,
  readableChapters = [],
  chapterTitles,
}: {
  mode: "novel" | "chapter";
  novelSlug: string;
  initialComments: NovelComment[];
  initialHasMore: boolean;
  initialCursor: CommentCursor | null;
  isLoggedIn: boolean;
  chapterNumber?: number;
  readableChapters?: ReadableChapter[];
  chapterTitles: Record<number, string>;
}) {
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const linkedComment = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const showLinkedComment = () => {
      const match = window.location.hash.match(/^#comment-([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i);
      linkedComment.current = null;
      if (!match) return;
      const targetId = match[1]!;
      const visible = document.getElementById(`comment-${targetId}`);
      if (visible) { visible.scrollIntoView({ block: "center" }); return; }
      linkedComment.current = targetId;
      loadCommentTarget(novelSlug, targetId, mode === "chapter" ? chapterNumber : undefined).then((result) => {
        if (cancelled || linkedComment.current !== targetId) return;
        if (result.error || !result.comment) {
          setError(result.error ?? "Could not load the linked comment.");
          return;
        }
        const target = result.comment;
        setComments((current) => current.some((c) => c.id === target.id)
          ? current.map((c) => c.id === target.id ? { ...c, replies: mergeCommentPages(c.replies, target.replies) } : c)
          : [...current, target]);
      }).catch(() => {
        if (!cancelled && linkedComment.current === targetId) setError("Could not load the linked comment. Please try again.");
      });
    };
    showLinkedComment();
    window.addEventListener("hashchange", showLinkedComment);
    return () => { cancelled = true; window.removeEventListener("hashchange", showLinkedComment); };
  }, [novelSlug, chapterNumber, mode]);

  useEffect(() => {
    if (!linkedComment.current) return;
    const target = document.getElementById(`comment-${linkedComment.current}`);
    if (target) { target.scrollIntoView({ block: "center" }); linkedComment.current = null; }
  }, [comments]);

  function handleLoadMore() {
    if (pending || !hasMore || !cursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await loadMoreComments(novelSlug, cursor, mode === "chapter" ? chapterNumber : undefined);
        if (result.error) { setError(result.error); return; }
        if (result.comments) setComments((prev) => mergeCommentPages(prev, result.comments!));
        setHasMore(Boolean(result.hasMore));
        setCursor(result.nextCursor ?? null);
      } catch {
        setError("Could not load comments. Please try again.");
      }
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
          setComments((prev) => [
            comment,
            ...(comment.rating != null
              ? prev.map((c) =>
                  c.isOwn && c.rating != null ? { ...c, rating: null } : c,
                )
              : prev),
          ])
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
                onReplyAdded={(parentId, reply) =>
                  setComments((prev) =>
                    prev.map((c) =>
                      c.id === parentId
                        ? { ...c, replies: mergeCommentPages(c.replies, [reply]), replyCount: (c.replyCount ?? c.replies.length) + 1 }
                        : c,
                    ),
                  )
                }
                onReplyDeleted={(parentId, replyId) =>
                  setComments((prev) =>
                    prev.map((c) =>
                      c.id === parentId
                        ? {
                            ...c,
                            replies: c.replies.filter((r) => r.id !== replyId),
                            replyCount: Math.max(0, (c.replyCount ?? c.replies.length) - 1),
                          }
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
            No comments yet. Be the first!
          </p>
        </div>
      )}

      {hasMore ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
          >
            {pending ? "Loading…" : "Load more comments"}
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
