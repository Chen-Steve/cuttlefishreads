"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, User } from "lucide-react";

import { deleteComment, updateComment } from "@/app/(main)/novels/actions";
import { Badge } from "@/components/ui/badge";
import type { NovelComment } from "@/types";

import { CommentLikeButton } from "./comment-like-button";

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommentItem({
  comment,
  isLoggedIn,
  mode,
  chapterTitles,
  onDeleted,
  onUpdated,
}: {
  comment: NovelComment;
  isLoggedIn: boolean;
  mode: "novel" | "chapter";
  chapterTitles: Record<number, string>;
  onDeleted?: (id: string) => void;
  onUpdated?: (id: string, body: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isEdited =
    new Date(comment.updatedAt).getTime() >
    new Date(comment.createdAt).getTime() + 1000;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmingDelete(false);
      onDeleted?.(comment.id);
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateComment(comment.id, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      onUpdated?.(comment.id, body.trim());
    });
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <User className="size-4 text-accent" strokeWidth={1.75} aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/u/${comment.username}`}
              className="text-sm font-semibold text-foreground transition-colors hover:text-accent"
            >
              {comment.username}
            </Link>
            <time
              dateTime={comment.createdAt}
              className="text-xs text-muted"
            >
              {formatTimestamp(comment.createdAt)}
            </time>
            {isEdited ? (
              <span className="text-xs text-muted">(edited)</span>
            ) : null}
          </div>

          {mode === "novel" ? (
            <div className="mt-1.5">
              {comment.chapterNumber == null ? (
                <Badge>General</Badge>
              ) : (
                <Link
                  href={`/novels/${comment.novelSlug}/${comment.chapterNumber}`}
                  className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  Chapter {comment.chapterNumber}
                  {chapterTitles[comment.chapterNumber]
                    ? `: ${chapterTitles[comment.chapterNumber]}`
                    : ""}
                </Link>
              )}
            </div>
          ) : null}

          {editing ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                maxLength={2000}
                disabled={pending}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending || !body.trim()}
                  className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setBody(comment.body);
                    setError(null);
                  }}
                  disabled={pending}
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {comment.body}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <CommentLikeButton
              commentId={comment.id}
              initialLiked={comment.likedByCurrentUser}
              initialCount={comment.likeCount}
              isLoggedIn={isLoggedIn}
            />

            {comment.isOwn && !editing ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
                >
                  <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          {confirmingDelete ? (
            <div
              role="dialog"
              aria-modal="false"
              aria-labelledby={`delete-comment-${comment.id}`}
              className="mt-3 rounded-xl border border-border bg-background p-3 shadow-sm"
            >
              <p
                id={`delete-comment-${comment.id}`}
                className="text-sm font-semibold text-foreground"
              >
                Delete this comment?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                This action cannot be undone.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setError(null);
                  }}
                  disabled={pending}
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
