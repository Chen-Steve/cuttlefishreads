"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MessageSquare, Reply, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { NovelComment } from "@/types";

import { replyToComment } from "../actions";

export type NovelCommentGroup = {
  novelSlug: string;
  novelTitle: string;
  comments: NovelComment[];
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function chapterLabel(comment: NovelComment): string {
  return comment.chapterNumber == null
    ? "General"
    : `Chapter ${comment.chapterNumber}`;
}

export function CommentsManager({ groups }: { groups: NovelCommentGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-12 text-center">
        <MessageSquare
          className="mx-auto size-8 text-muted"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted">
          No reader comments on your novels yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.novelSlug}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {group.novelTitle}
            </h2>
            <Link
              href={`/novels/${group.novelSlug}`}
              className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
            >
              View novel
            </Link>
          </div>

          <ul className="mt-3 space-y-3">
            {group.comments.map((comment) => (
              <li key={comment.id}>
                <CommentRow comment={comment} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CommentRow({ comment }: { comment: NovelComment }) {
  const [replies, setReplies] = useState<NovelComment[]>(comment.replies);
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await replyToComment(comment.id, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.reply) {
        setReplies((prev) => [...prev, result.reply!]);
      }
      setBody("");
      setReplying(false);
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
            <time dateTime={comment.createdAt} className="text-xs text-muted">
              {formatTimestamp(comment.createdAt)}
            </time>
            {comment.chapterNumber == null ? (
              <Badge>General</Badge>
            ) : (
              <Link
                href={`/novels/${comment.novelSlug}/${comment.chapterNumber}`}
                className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
              >
                {chapterLabel(comment)}
              </Link>
            )}
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {comment.body}
          </p>

          {replies.length > 0 ? (
            <ul className="mt-3 space-y-2 border-l-2 border-border pl-3">
              {replies.map((reply) => (
                <li
                  key={reply.id}
                  className="rounded-lg bg-background p-3"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-foreground">
                      {reply.username}
                    </span>
                    {reply.isTranslatorReply ? (
                      <Badge className="border-accent/40 bg-accent/10 text-accent">
                        Translator
                      </Badge>
                    ) : null}
                    <time
                      dateTime={reply.createdAt}
                      className="text-xs text-muted"
                    >
                      {formatTimestamp(reply.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {reply.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3">
            {replying ? (
              <div className="space-y-2">
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  disabled={pending}
                  placeholder="Write a reply…"
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={pending || !body.trim()}
                    className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {pending ? "Posting…" : "Post reply"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplying(false);
                      setBody("");
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
              <button
                type="button"
                onClick={() => setReplying(true)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-accent"
              >
                <Reply className="size-3.5" strokeWidth={1.75} aria-hidden />
                Reply
              </button>
            )}

            {error ? (
              <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
