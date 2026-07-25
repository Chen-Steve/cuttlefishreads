import Link from "next/link";
import { Lock, MessagesSquare, Pin } from "lucide-react";

import { ForumAvatar } from "@/components/forum/forum-avatar";
import { forumProfileUrl, forumThreadUrl } from "@/lib/forum/constants";
import type { ForumThreadSummary } from "@/lib/forum/types";
import { formatRelativeDate } from "@/lib/utils";

export function ForumThreadList({
  threads,
  emptyMessage = "No threads here yet. Start the first one.",
}: {
  threads: ForumThreadSummary[];
  emptyMessage?: string;
}) {
  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
        <MessagesSquare
          className="mx-auto size-8 text-muted"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {threads.map((thread) => (
        <li key={thread.id}>
          <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
            <ForumAvatar author={thread.author} />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                {thread.isPinned ? (
                  <Pin
                    className="size-3.5 shrink-0 text-accent"
                    strokeWidth={2}
                    aria-label="Pinned"
                  />
                ) : null}
                {thread.isLocked ? (
                  <Lock
                    className="size-3.5 shrink-0 text-muted"
                    strokeWidth={2}
                    aria-label="Locked"
                  />
                ) : null}
                <Link
                  href={forumThreadUrl(thread.id)}
                  className="truncate font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {thread.title}
                </Link>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">
                <Link
                  href={forumProfileUrl(thread.author.username)}
                  className="transition-colors hover:text-accent"
                >
                  {thread.author.username}
                </Link>
                {" · "}
                {formatRelativeDate(thread.createdAt)}
              </p>
            </div>

            <div className="shrink-0 text-right text-xs text-muted tabular-nums">
              <p className="text-sm font-medium text-foreground">
                {thread.replyCount.toLocaleString()}
              </p>
              <p>{thread.replyCount === 1 ? "reply" : "replies"}</p>
            </div>

            <div className="hidden w-28 shrink-0 text-right text-xs text-muted sm:block">
              {formatRelativeDate(thread.lastPostAt)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
