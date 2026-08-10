export type NotificationType =
  | "reply"
  | "like"
  | "chapter_published"
  | "chapter_released";

export type AppNotification = {
  id: string;
  type: NotificationType;
  commentId: string | null;
  replyId: string | null;
  novelId: string | null;
  novelSlug: string;
  novelTitle: string;
  chapterNumber: number | null;
  chapterTitle: string | null;
  excerpt: string;
  actor: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  readAt: string | null;
  createdAt: string;
};

export function notificationHref(notification: {
  type: NotificationType;
  novelSlug: string;
  chapterNumber: number | null;
  commentId: string | null;
  replyId: string | null;
}): string {
  if (
    notification.type === "chapter_published" ||
    notification.type === "chapter_released"
  ) {
    if (notification.chapterNumber != null && notification.novelSlug) {
      return `/novels/${notification.novelSlug}/${notification.chapterNumber}`;
    }
    return notification.novelSlug
      ? `/novels/${notification.novelSlug}`
      : "/library";
  }

  const anchor = notification.replyId ?? notification.commentId;
  const path =
    notification.chapterNumber != null
      ? `/novels/${notification.novelSlug}/${notification.chapterNumber}`
      : `/novels/${notification.novelSlug}`;
  return anchor ? `${path}#comment-${anchor}` : path;
}
