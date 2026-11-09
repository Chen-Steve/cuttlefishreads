import { unstable_cache } from "next/cache";

import {
  COMMENTS_PAGE_SIZE,
  REPLIES_PAGE_SIZE,
  commentCursorFilter,
  validateCommentCursor,
  type CommentCursor,
} from "@/lib/comment-pagination";
import type { NovelComment } from "@/types";
import { getServerSupabase } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { getNovel } from "./catalog";
import { isChapterReadable } from "./chapters";
import type { Tables } from "@/lib/database.types";
import { COMMENTS_REVALIDATE_SECONDS, getCurrentUser, novelCommentsCacheTag } from "./shared";

type DbCommentRow = Pick<
  Tables<"novel_comments">,
  | "id"
  | "novel_slug"
  | "chapter_number"
  | "parent_id"
  | "body"
  | "rating"
  | "user_id"
  | "created_at"
  | "updated_at"
>;

const COMMENT_COLUMNS =
  "id, novel_slug, chapter_number, parent_id, body, rating, user_id, created_at, updated_at";

async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

async function fetchProfileUsernames(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  if (error) {
    console.error("fetchProfileUsernames:", error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      profile.username ?? "Unknown",
    ]),
  );
}

// Fetches the publisher (translator) id for a novel so replies authored by the
// translator can be badged. Returns null when the novel or column is missing.
async function fetchNovelPublisherId(slug: string): Promise<string | null> {
  const novel = await getNovel(slug);
  return novel?.publisherId ?? null;
}

async function fetchReplyRows(parentIds: string[]): Promise<DbCommentRow[]> {
  if (parentIds.length === 0) return [];

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("novel_comments")
    .select(COMMENT_COLUMNS)
    .in("parent_id", parentIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchReplyRows:", error);
    return [];
  }

  return (data ?? []) as DbCommentRow[];
}

type CountedCommentRow = DbCommentRow & {
  likes: { count: number }[];
  comment_reply_count: number;
};

// Counts are computed in Postgres, never by downloading all liker/reply rows.
const PAGED_COMMENT_COLUMNS = `${COMMENT_COLUMNS}, likes:novel_comment_likes(count), comment_reply_count`;

type CachedCommentPage = {
  rows: CountedCommentRow[];
  usernames: Record<string, string>;
  hasMore: boolean;
  nextCursor: CommentCursor | null;
};

export type NovelCommentsResult = {
  comments: NovelComment[];
  hasMore: boolean;
  nextCursor: CommentCursor | null;
};

/** Shared public rows only. Personal ownership/like flags are added afterward. */
async function fetchCachedCommentPage(
  slug: string,
  chapterNumber: number | null,
  parentId: string | null,
  cursor: CommentCursor | null,
): Promise<CachedCommentPage> {
  const ascending = parentId != null;
  const limit = ascending ? REPLIES_PAGE_SIZE : COMMENTS_PAGE_SIZE;
  return unstable_cache(
    async (): Promise<CachedCommentPage> => {
      const admin = createAdminClient();
      let query = admin.from("novel_comments")
        .select(PAGED_COMMENT_COLUMNS)
        .eq("novel_slug", slug)
        .order("created_at", { ascending })
        .order("id", { ascending })
        .limit(limit + 1);
      query = parentId == null ? query.is("parent_id", null) : query.eq("parent_id", parentId);
      if (chapterNumber != null) query = query.eq("chapter_number", chapterNumber);
      if (cursor) query = query.or(commentCursorFilter(cursor, ascending));
      const { data, error } = await query;
      if (error) throw new Error("Could not load comments", { cause: error });
      const fetched = (data ?? []) as unknown as CountedCommentRow[];
      const rows = fetched.slice(0, limit);
      const hasMore = fetched.length > limit;
      const last = rows.at(-1);
      const nextCursor = hasMore && last ? { createdAt: last.created_at, id: last.id } : null;
      if (rows.length === 0) return { rows, usernames: {}, hasMore: false, nextCursor: null };
      const { data: profiles, error: profileError } = await admin.from("profiles")
        .select("id, username").in("id", [...new Set(rows.map((row) => row.user_id))]);
      if (profileError) throw new Error("Could not load comment authors", { cause: profileError });
      return {
        rows, hasMore, nextCursor,
        usernames: Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.username ?? "Unknown"])),
      };
    },
    ["comment-page-v2", slug, String(chapterNumber ?? "all"), parentId ?? "top", JSON.stringify(cursor)],
    { revalidate: COMMENTS_REVALIDATE_SECONDS, tags: [novelCommentsCacheTag(slug)] },
  )();
}

async function personalizeCommentPage(
  slug: string,
  page: CachedCommentPage,
): Promise<NovelCommentsResult> {
  const [currentUserId, publisherId] = await Promise.all([getCurrentUserId(), fetchNovelPublisherId(slug)]);
  const liked = new Set<string>();
  if (currentUserId && page.rows.length > 0) {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from("novel_comment_likes")
      .select("comment_id").eq("user_id", currentUserId).in("comment_id", page.rows.map((row) => row.id));
    if (error) throw new Error("Could not load your comment likes", { cause: error });
    for (const row of data ?? []) liked.add(row.comment_id);
  }
  return {
    comments: page.rows.map((row) => ({
      id: row.id, novelSlug: row.novel_slug, chapterNumber: row.chapter_number,
      parentId: row.parent_id, body: row.body, rating: row.rating ?? null,
      userId: row.user_id, username: page.usernames[row.user_id] ?? "Unknown",
      likeCount: Number(row.likes?.[0]?.count ?? 0), likedByCurrentUser: liked.has(row.id),
      isOwn: currentUserId === row.user_id,
      isTranslatorReply: row.parent_id != null && publisherId != null && row.user_id === publisherId,
      replies: [], replyCount: Number(row.comment_reply_count ?? 0),
      createdAt: row.created_at, updatedAt: row.updated_at,
    })),
    hasMore: page.hasMore, nextCursor: page.nextCursor,
  };
}

export async function getChapterComments(
  slug: string,
  chapterNumber: number,
  options: { cursor?: CommentCursor | null } = {},
): Promise<NovelCommentsResult> {
  const cursor = validateCommentCursor(options.cursor);
  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1 || !(await isChapterReadable(slug, chapterNumber))) {
    throw new Error("Unlock this chapter to read its comments.");
  }
  return personalizeCommentPage(slug, await fetchCachedCommentPage(slug, chapterNumber, null, cursor));
}

export async function getNovelComments(
  slug: string,
  options: { cursor?: CommentCursor | null } = {},
): Promise<NovelCommentsResult> {
  const cursor = validateCommentCursor(options.cursor);
  return personalizeCommentPage(slug, await fetchCachedCommentPage(slug, null, null, cursor));
}

export async function getCommentReplies(
  parentId: string,
  options: { cursor?: CommentCursor | null } = {},
): Promise<NovelCommentsResult> {
  const cursor = validateCommentCursor(options.cursor);
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(parentId)) throw new Error("Invalid comment.");
  const admin = createAdminClient();
  const { data: parent, error } = await admin.from("novel_comments")
    .select("id, novel_slug, chapter_number, parent_id").eq("id", parentId).maybeSingle();
  if (error) throw new Error("Could not load comment thread", { cause: error });
  if (!parent || parent.parent_id != null) throw new Error("Comment not found.");
  if (parent.chapter_number != null && !(await isChapterReadable(parent.novel_slug, parent.chapter_number))) {
    throw new Error("Unlock this chapter to read its replies.");
  }
  return personalizeCommentPage(parent.novel_slug, await fetchCachedCommentPage(
    parent.novel_slug, parent.chapter_number, parentId, cursor,
  ));
}

/** Resolve a notification/hash target without walking every earlier page. */
export async function getCommentTarget(
  slug: string,
  targetId: string,
  chapterNumber?: number,
): Promise<NovelComment | null> {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(targetId)) throw new Error("Invalid comment.");
  const admin = createAdminClient();
  const { data: target, error } = await admin.from("novel_comments")
    .select(PAGED_COMMENT_COLUMNS).eq("novel_slug", slug).eq("id", targetId).maybeSingle();
  if (error) throw new Error("Could not load linked comment", { cause: error });
  if (!target || (chapterNumber != null && target.chapter_number !== chapterNumber)) return null;
  if (target.chapter_number != null && !(await isChapterReadable(slug, target.chapter_number))) {
    throw new Error("Unlock this chapter to read its comments.");
  }
  const rows = [target as unknown as CountedCommentRow];
  if (target.parent_id) {
    const { data: parent, error: parentError } = await admin.from("novel_comments")
      .select(PAGED_COMMENT_COLUMNS).eq("novel_slug", slug).eq("id", target.parent_id).is("parent_id", null).maybeSingle();
    if (parentError) throw new Error("Could not load linked thread", { cause: parentError });
    if (!parent || parent.chapter_number !== target.chapter_number) return null;
    rows.unshift(parent as unknown as CountedCommentRow);
  }
  const { data: profiles, error: profileError } = await admin.from("profiles")
    .select("id, username").in("id", [...new Set(rows.map((row) => row.user_id))]);
  if (profileError) throw new Error("Could not load comment authors", { cause: profileError });
  const page = await personalizeCommentPage(slug, {
    rows, hasMore: false, nextCursor: null,
    usernames: Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.username ?? "Unknown"])),
  });
  const [parent, reply] = page.comments;
  if (reply) parent.replies = [reply];
  return parent;
}

export type AccountCommentReply = {
  id: string;
  username: string;
  body: string;
  createdAt: string;
  isTranslatorReply: boolean;
};

export type AccountComment = {
  id: string;
  novelSlug: string;
  novelTitle: string;
  chapterNumber: number | null;
  body: string;
  createdAt: string;
  replies: AccountCommentReply[];
};

export async function getUserComments(
  userId: string,
  options: { limit?: number } = {},
): Promise<AccountComment[]> {
  const limit = options.limit ?? 50;
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("novel_comments")
    .select(COMMENT_COLUMNS)
    .eq("user_id", userId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getUserComments:", error);
    return [];
  }

  const topLevelRows = (data ?? []) as DbCommentRow[];
  if (topLevelRows.length === 0) return [];

  const parentIds = topLevelRows.map((row) => row.id);
  const replyRows = await fetchReplyRows(parentIds);

  const slugs = [...new Set(topLevelRows.map((row) => row.novel_slug))];
  const replyUserIds = [...new Set(replyRows.map((row) => row.user_id))];

  const [{ data: novels }, usernames] = await Promise.all([
    supabase.from("novels").select("slug, title, publisher_id").in("slug", slugs),
    fetchProfileUsernames(replyUserIds),
  ]);

  const novelBySlug = new Map(
    (novels ?? []).map((novel) => [
      novel.slug as string,
      {
        title: (novel.title as string) ?? (novel.slug as string),
        publisherId: (novel.publisher_id as string | null) ?? null,
      },
    ]),
  );

  const repliesByParent = new Map<string, AccountCommentReply[]>();
  for (const row of replyRows) {
    if (!row.parent_id) continue;
    const list = repliesByParent.get(row.parent_id) ?? [];
    const novel = novelBySlug.get(row.novel_slug);
    list.push({
      id: row.id,
      username: usernames.get(row.user_id) ?? "Unknown",
      body: row.body,
      createdAt: row.created_at,
      isTranslatorReply:
        novel?.publisherId != null && row.user_id === novel.publisherId,
    });
    repliesByParent.set(row.parent_id, list);
  }

  return topLevelRows.map((row) => {
    const novel = novelBySlug.get(row.novel_slug);
    return {
      id: row.id,
      novelSlug: row.novel_slug,
      novelTitle: novel?.title ?? row.novel_slug,
      chapterNumber: row.chapter_number,
      body: row.body,
      createdAt: row.created_at,
      replies: repliesByParent.get(row.id) ?? [],
    };
  });
}

export type ReadableChapter = {
  number: number;
  title: string;
};
