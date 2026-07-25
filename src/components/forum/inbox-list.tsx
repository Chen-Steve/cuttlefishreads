"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(originals)/originals/forum/actions";
import { ForumAvatar } from "@/components/forum/forum-avatar";
import { forumReactionSymbol, forumThreadUrl } from "@/lib/forum/constants";
import type { ForumNotification } from "@/lib/forum/types";
import { cn, formatRelativeDate } from "@/lib/utils";

function excerpt(text: string, limit = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function describe(notification: ForumNotification) {
  if (notification.type === "reaction") {
    const symbol = notification.emoji
      ? forumReactionSymbol(notification.emoji)
      : "";
    return `reacted ${symbol} to your post in`;
  }
  return "replied in";
}

export function InboxList({
  notifications,
}: {
  notifications: ForumNotification[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unreadCount = notifications.filter(
    (notification) => notification.readAt == null,
  ).length;

  function handleOpen(notification: ForumNotification) {
    if (notification.readAt != null) return;
    startTransition(async () => {
      await markNotificationRead(notification.id);
      router.refresh();
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
        <Bell className="mx-auto size-8 text-muted" strokeWidth={1.5} aria-hidden />
        <p className="mt-3 text-sm text-muted">
          Nothing here yet. Replies and reactions to your posts will show up in
          this inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted tabular-nums">
            {unreadCount} unread
          </p>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      ) : null}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {notifications.map((notification) => {
          const unread = notification.readAt == null;

          return (
            <li key={notification.id}>
              <Link
                href={forumThreadUrl(notification.threadId, {
                  postId: notification.postId,
                })}
                onClick={() => handleOpen(notification)}
                className={cn(
                  "flex gap-3 px-4 py-3.5 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:gap-4 sm:px-5",
                  unread && "bg-accent/5",
                )}
              >
                <ForumAvatar author={notification.actor} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">
                      {notification.actor.username}
                    </span>{" "}
                    <span className="text-muted">
                      {describe(notification)}
                    </span>{" "}
                    <span className="font-medium">
                      {notification.threadTitle}
                    </span>
                  </p>
                  {notification.excerpt ? (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {excerpt(notification.excerpt)}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-muted">
                    {formatRelativeDate(notification.createdAt)}
                  </p>
                </div>

                {unread ? (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
                    aria-label="Unread"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
