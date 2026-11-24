import {
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { getServerSupabase } from "@/utils/supabase/auth";

export type {
  AppNotification,
  NotificationType,
} from "@/lib/notifications/types";
export { notificationHref } from "@/lib/notifications/types";

export const NOTIFICATIONS_PER_PAGE = 50;
const NOTIFICATION_BATCH_SIZE = 500;

type NotifyRow = {
  user_id: string;
  actor_id?: string | null;
  type: NotificationType;
  comment_id?: string | null;
  reply_id?: string | null;
  novel_id?: string | null;
  chapter_number?: number | null;
};

function toInsertRow(row: NotifyRow) {
  return {
    user_id: row.user_id,
    actor_id: row.actor_id ?? null,
    type: row.type,
    comment_id: row.comment_id ?? null,
    reply_id: row.reply_id ?? null,
    novel_id: row.novel_id ?? null,
    chapter_number: row.chapter_number ?? null,
  };
}

/**
 * Inbox rows are written with a service-only RPC that skips duplicates in SQL.
 * Bound each request and process chunks sequentially to avoid request bursts.
 */
export async function notifyUsers(rows: NotifyRow[]) {
  const filtered = rows.filter(
    (row) => !row.actor_id || row.user_id !== row.actor_id,
  );
  if (filtered.length === 0) return;

  const admin = createAdminClient();
  const payload = filtered.map(toInsertRow);
  for (let offset = 0; offset < payload.length; offset += NOTIFICATION_BATCH_SIZE) {
    const { error } = await admin.rpc("batch_insert_notifications", {
      p_rows: payload.slice(offset, offset + NOTIFICATION_BATCH_SIZE),
    });
    if (error) console.error("notifyUsers batch:", error);
  }
}

/**
 * Notify bookmarkers about one or more chapter publish/release events.
 * The database inserts one row per reader (free and locked chapters stay
 * separate) instead of one row per chapter.
 */
export async function notifyBookmarkersOfChapters(opts: {
  novelId: string;
  chapters: Array<{ chapterNumber: number; released: boolean }>;
  excludeUserId?: string | null;
}) {
  if (opts.chapters.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.rpc("notify_bookmarkers_of_chapters", {
    p_novel_id: opts.novelId,
    p_chapters: opts.chapters.map((chapter) => ({
      number: chapter.chapterNumber,
      released: chapter.released,
    })),
    p_exclude_user_id: opts.excludeUserId ?? undefined,
  });

  if (error) console.error("notifyBookmarkersOfChapters:", error);
}

/**
 * Create chapter_released rows for timed unlocks that became free today for
 * one reader. Runs on inbox load so we don't need a cron.
 */
async function materializeDueChapterReleases(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("materialize_due_chapter_releases", {
    p_user_id: userId,
  });

  if (error) {
    console.error("materializeDueChapterReleases:", error);
    return 0;
  }

  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function getNotifications(
  userId: string,
): Promise<AppNotification[]> {
  await materializeDueChapterReleases(userId);

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, comment_id, reply_id, novel_id, chapter_number, chapter_count, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, avatar_url), comment:novel_comments!notifications_comment_id_fkey(body, novel_slug, chapter_number), reply:novel_comments!notifications_reply_id_fkey(body), novel:novels!notifications_novel_id_fkey(slug, title)",
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
    chapter_count: number | null;
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
        (row.chapter_count ?? 1) <= 1 &&
        (row.type === "chapter_published" || row.type === "chapter_released"),
    )
    .map((row) => ({
      novelId: row.novel_id as string,
      number: row.chapter_number as number,
    }));

  const chapterTitles = new Map<string, string>();
  if (chapterKeys.length > 0) {
    const uniqueKeys = [
      ...new Map(
        chapterKeys.map((key) => [`${key.novelId}:${key.number}`, key]),
      ).values(),
    ];
    const { data: chapters } = await supabase
      .from("chapters")
      .select("novel_id, number, title")
      .or(
        uniqueKeys
          .map(
            (key) =>
              `and(novel_id.eq.${key.novelId},number.eq.${key.number})`,
          )
          .join(","),
      );
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
      chapterCount:
        row.type === "chapter_published" || row.type === "chapter_released"
          ? Math.max(1, Number(row.chapter_count ?? 1))
          : 1,
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
