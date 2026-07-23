"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { AccountComment } from "@/lib/data";
import { cn } from "@/lib/utils";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function commentHref(comment: AccountComment): string {
  if (comment.chapterNumber != null) {
    return `/novels/${comment.novelSlug}/${comment.chapterNumber}`;
  }
  return `/novels/${comment.novelSlug}`;
}

function locationLabel(comment: AccountComment): string {
  if (comment.chapterNumber != null) {
    return `${comment.novelTitle} · Ch. ${comment.chapterNumber}`;
  }
  return comment.novelTitle;
}

function CommentRow({ comment }: { comment: AccountComment }) {
  const [open, setOpen] = useState(false);
  const replyCount = comment.replies.length;

  return (
    <li className="px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <Link
            href={commentHref(comment)}
            className="truncate text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          >
            {locationLabel(comment)}
          </Link>
          <time
            dateTime={comment.createdAt}
            className="shrink-0 text-[11px] text-muted"
          >
            {formatDate(comment.createdAt)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-foreground">
          {comment.body}
        </p>
      </div>

      {replyCount > 0 ? (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-150",
                open && "rotate-180",
              )}
              strokeWidth={2}
              aria-hidden
            />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>

          {open ? (
            <ul className="mt-1.5 space-y-1.5 border-l border-border pl-2.5">
              {comment.replies.map((reply) => (
                <li key={reply.id} className="rounded-lg bg-background px-2.5 py-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      href={`/u/${reply.username}`}
                      className="text-xs font-semibold text-foreground transition-colors hover:text-accent"
                    >
                      {reply.username}
                    </Link>
                    {reply.isTranslatorReply ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                        Translator
                      </span>
                    ) : null}
                    <time
                      dateTime={reply.createdAt}
                      className="text-[11px] text-muted"
                    >
                      {formatDate(reply.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs leading-snug text-foreground/90">
                    {reply.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function AccountComments({
  comments,
  hideHeading = false,
}: {
  comments: AccountComment[];
  hideHeading?: boolean;
}) {
  return (
    <section>
      {hideHeading ? null : (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Your Comments</h2>
          <span className="text-[11px] tabular-nums text-muted">
            {comments.length}
          </span>
        </div>
      )}

      {comments.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
          You haven&apos;t posted any comments yet.
        </p>
      )}
    </section>
  );
}
