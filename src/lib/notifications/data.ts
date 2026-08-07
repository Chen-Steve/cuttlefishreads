import { cookies } from "next/headers";

import {
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type {
  AppNotification,
  NotificationType,
} from "@/lib/notifications/types";
export {
  notificationHref,
  commentNotificationHref,
} from "@/lib/notifications/types";
export type {
  CommentNotification,
  CommentNotificationType,
} from "@/lib/notifications/types";

export const NOTIFICATIONS_PER_PAGE = 50;

type NotifyRow = {
  user_id: string;
  actor_id?: string | null;
  type: NotificationType;
  comment_id?: string | null;
  reply_id?: string | null;
  novel_id?: string | null;
  chapter_number?: number | null;
};

/**
 * Inbox rows are written with the service role. Duplicates (code 23505) are
 * ignored so re-likes / re-publishes stay quiet.
 */
export async function notifyUsers(rows: NotifyRow[]) {
  const filtered = rows.filter(
    (row) => !row.actor_id || row.user_id !== row.actor_id,
  );
  if (filtered.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(
    filtered.map((row) => ({
      user_id: row.user_id,
      actor_id: row.actor_id ?? null,
      type: row.type,
      comment_id: row.comment_id ?? null,
      reply_id: row.reply_id ?? null,
      novel_id: row.novel_id ?? null,
      chapter_number: row.chapter_number ?? null,
    })),
  );
  if (error && error.code !== "23505") {
    // Batch insert can fail entirely on one conflict — fall back per-row.
    for (const row of filtered) {
      const { error: rowError } = await admin.from("notifications").insert({
        user_id: row.user_id,
        actor_id: row.actor_id ?? null,
        type: row.type,
        comment_id: row.comment_id ?? null,
        reply_id: row.reply_id ?? null,
        novel_id: row.novel_id ?? null,
        chapter_number: row.chapter_number ?? null,
      });
      if (rowError && rowError.code !== "23505") {
        console.error("notifyUsers:", rowError);
      }
    }
  }
}

/** @deprecated Use notifyUsers */
export async function notifyComment(
  rows: Array<{
    user_id: string;
    actor_id: string;
    type: "reply" | "like";
    comment_id: string;
    reply_id?: string | null;
  }>,
) {
  await notifyUsers(rows);
}

export async function notifyBookmarkersOfChapter(opts: {
  novelId: string;
  chapterNumber: number;
  /** Free now (is_free or unlock_at already due). */
  released: boolean;
  excludeUserId?: string | null;
}) {
  const admin = createAdminClient();
  const { data: bookmarks, error } = await admin
    .from("bookmarks")
    .select("user_id")
    .eq("novel_id", opts.novelId);

  if (error) {
    console.error("notifyBookmarkersOfChapter:", error);
    return;
  }

  const recipients = [
    ...new Set(
      (bookmarks ?? [])
        .map((row) => row.user_id as string)
        .filter((id) => id && id !== opts.excludeUserId),
    ),
  ];
  if (recipients.length === 0) return;

  await notifyUsers(
    recipients.map((userId) => ({
      user_id: userId,
      type: opts.released ? "chapter_released" : "chapter_published",
      novel_id: opts.novelId,
      chapter_number: opts.chapterNumber,
    })),
  );
}

/**
 * Create chapter_released rows for timed unlocks that became free today for
 * this reader's bookmarked novels. Runs on inbox load so we don't need cron.
 * Only today's unlocks — never backfill older released chapters.
 */
async function materializeDueChapterReleases(userId: string) {
  const admin = createAdminClient();

  const { data: bookmarks } = await admin
    .from("bookmarks")
    .select("novel_id")
    .eq("user_id", userId);

  const novelIds = [
    ...new Set((bookmarks ?? []).map((row) => row.novel_id as string)),
  ];
  if (novelIds.length === 0) return;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const { data: dueChapters, error } = await admin
    .from("chapters")
    .select("novel_id, number, unlock_at")
    .in("novel_id", novelIds)
    .eq("is_published", true)
    .eq("is_free", false)
    .not("unlock_at", "is", null)
    .gte("unlock_at", startOfToday.toISOString())
    .lte("unlock_at", now.toISOString());

  if (error) {
    console.error("materializeDueChapterReleases:", error);
    return;
  }
  if (!dueChapters?.length) return;

  await notifyUsers(
    dueChapters.map((chapter) => ({
      user_id: userId,
      type: "chapter_released" as const,
      novel_id: chapter.novel_id as string,
      chapter_number: chapter.number as number,
    })),
  );
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  await materializeDueChapterReleases(userId);

  const supabase = createClient(await cookies());
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .is("dismissed_at", null);

  if (error) {
    console.error("getUnreadNotificationCount:", error);
    return 0;
  }

  return count ?? 0;
}

/** @deprecated Use getUnreadNotificationCount */
export const getUnreadCommentNotificationCount = getUnreadNotificationCount;

export async function getNotifications(
  userId: string,
): Promise<AppNotification[]> {
  await materializeDueChapterReleases(userId);

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, comment_id, reply_id, novel_id, chapter_number, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, avatar_url), comment:novel_comments!notifications_comment_id_fkey(body, novel_slug, chapter_number), reply:novel_comments!notifications_reply_id_fkey(body), novel:novels!notifications_novel_id_fkey(slug, title)",
    )
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("read_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_PER_PAGE);

  if (error) {
    console.error("getNotifications:", error);
    return [];
  }

  type DbRow = {
    id: string;
    type: NotificationType;
    comment_id: string | null;
    reply_id: string | null;
    novel_id: string | null;
    chapter_number: number | null;
    read_at: string | null;
    created_at: string;
    actor: {
      id: string;
      username: string | null;
      avatar_url: string | null;
    } | null;
    comment: {
      body: string;
      novel_slug: string;
      chapter_number: number | null;
    } | null;
    reply: { body: string } | null;
    novel: { slug: string; title: string } | null;
  };

  const rows = (data ?? []) as unknown as DbRow[];
  if (rows.length === 0) return [];

  const chapterKeys = rows
    .filter(
      (row) =>
        row.novel_id &&
        row.chapter_number != null &&
        (row.type === "chapter_published" || row.type === "chapter_released"),
    )
    .map((row) => ({
      novelId: row.novel_id as string,
      number: row.chapter_number as number,
    }));

  const chapterTitles = new Map<string, string>();
  if (chapterKeys.length > 0) {
    const novelIds = [...new Set(chapterKeys.map((key) => key.novelId))];
    const { data: chapters } = await supabase
      .from("chapters")
      .select("novel_id, number, title")
      .in("novel_id", novelIds);
    for (const chapter of chapters ?? []) {
      chapterTitles.set(
        `${chapter.novel_id}:${chapter.number}`,
        (chapter.title as string) || `Chapter ${chapter.number}`,
      );
    }
  }

  return rows.map((row) => {
    const isChapter =
      row.type === "chapter_published" || row.type === "chapter_released";
    const novelSlug = isChapter
      ? (row.novel?.slug ?? "")
      : (row.comment?.novel_slug ?? row.novel?.slug ?? "");
    const novelTitle = isChapter
      ? (row.novel?.title ?? novelSlug)
      : (row.novel?.title ?? row.comment?.novel_slug ?? novelSlug);
    const chapterNumber = isChapter
      ? row.chapter_number
      : (row.comment?.chapter_number ?? row.chapter_number);
    const chapterTitle =
      row.novel_id && row.chapter_number != null
        ? (chapterTitles.get(`${row.novel_id}:${row.chapter_number}`) ?? null)
        : null;
    const excerpt = isChapter
      ? (chapterTitle ?? "")
      : row.type === "reply"
        ? (row.reply?.body ?? row.comment?.body ?? "")
        : (row.comment?.body ?? "");

    return {
      id: row.id,
      type: row.type,
      commentId: row.comment_id,
      replyId: row.reply_id,
      novelId: row.novel_id,
      novelSlug,
      novelTitle,
      chapterNumber,
      chapterTitle,
      excerpt,
      actor: row.actor
        ? {
            id: row.actor.id,
            username: row.actor.username ?? "Unknown",
            avatarUrl: row.actor.avatar_url ?? null,
          }
        : null,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  });
}

/** @deprecated Use getNotifications */
export const getCommentNotifications = getNotifications;
