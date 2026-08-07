"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Heart,
  MessageCircle,
  Trash2,
  Unlock,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteAllNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(main)/notifications/actions";
import {
  notificationHref,
  type AppNotification,
} from "@/lib/notifications/types";
import { cn, formatRelativeDate } from "@/lib/utils";

function excerpt(text: string, limit = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

/** Show ~60% of the title (40% shorter) so notification rows stay scannable. */
function shortenNovelTitle(title: string): string {
  const trimmed = title.trim();
  const max = Math.floor(trimmed.length * 0.6);
  if (max >= trimmed.length || max < 8) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function locationLabel(notification: AppNotification) {
  const novelTitle = shortenNovelTitle(notification.novelTitle);
  if (notification.chapterNumber != null) {
    const chapter =
      notification.chapterTitle?.trim() ||
      `Ch. ${notification.chapterNumber}`;
    return `${novelTitle} · ${chapter}`;
  }
  return novelTitle;
}

function describe(notification: AppNotification): string {
  switch (notification.type) {
    case "like":
      return "liked your comment on";
    case "reply":
      return "replied to your comment on";
    case "chapter_published":
      return "New chapter uploaded for";
    case "chapter_released":
      return "New Chapter Release:";
    default:
      return "updated";
  }
}

function TypeIcon({ type }: { type: AppNotification["type"] }) {
  const className = "size-2.5";
  switch (type) {
    case "like":
      return <Heart className={className} strokeWidth={2.25} aria-hidden />;
    case "reply":
      return (
        <MessageCircle className={className} strokeWidth={2.25} aria-hidden />
      );
    case "chapter_released":
      return <Unlock className={className} strokeWidth={2.25} aria-hidden />;
    case "chapter_published":
    default:
      return <BookOpen className={className} strokeWidth={2.25} aria-hidden />;
  }
}

export function NotificationsList({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unreadCount = notifications.filter(
    (notification) => notification.readAt == null,
  ).length;

  function handleOpen(notification: AppNotification) {
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

  function handleDelete(notificationId: string) {
    startTransition(async () => {
      const result = await deleteNotification(notificationId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleClearAll() {
    startTransition(async () => {
      const result = await deleteAllNotifications();
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
        <Bell
          className="mx-auto size-8 text-muted"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted">
          Comment replies, likes, and new chapters from bookmarked
          novels will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted tabular-nums">
          {unreadCount > 0 ? `${unreadCount} unread` : `${notifications.length} total`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={pending}
              className="inline-flex h-8 items-center rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleClearAll}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
          >
            Clear all
          </button>
        </div>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {notifications.map((notification) => {
          const unread = notification.readAt == null;
          const isChapter =
            notification.type === "chapter_published" ||
            notification.type === "chapter_released";

          return (
            <li key={notification.id} className="flex items-stretch">
              <Link
                href={notificationHref(notification)}
                onClick={() => handleOpen(notification)}
                className={cn(
                  "flex min-w-0 flex-1 gap-3 px-4 py-3.5 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:gap-4 sm:px-5",
                  unread && "bg-accent/5",
                )}
              >
                <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-accent">
                  {!isChapter && notification.actor?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={notification.actor.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : !isChapter && notification.actor ? (
                    <User className="size-4" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <BookOpen
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  )}
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full border border-surface bg-background text-accent">
                    <TypeIcon type={notification.type} />
                  </span>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {!isChapter && notification.actor ? (
                      <>
                        <span className="font-semibold">
                          {notification.actor.username}
                        </span>{" "}
                        <span className="text-muted">
                          {describe(notification)}
                        </span>{" "}
                        <span className="font-medium">
                          {locationLabel(notification)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted">
                          {describe(notification)}
                        </span>{" "}
                        <span className="font-medium">
                          {locationLabel(notification)}
                        </span>
                      </>
                    )}
                  </p>
                  {notification.excerpt && !isChapter ? (
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

              <button
                type="button"
                onClick={() => handleDelete(notification.id)}
                disabled={pending}
                aria-label="Delete notification"
                title="Delete"
                className={cn(
                  "inline-flex shrink-0 items-center justify-center px-3 text-muted transition-colors hover:bg-background hover:text-red-600 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-50 dark:hover:text-red-400 sm:px-4",
                  unread && "bg-accent/5",
                )}
              >
                <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
