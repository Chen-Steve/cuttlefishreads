import { cookies } from "next/headers";

import type { Genre, Language } from "@/lib/constants";
import { getAllTimeViewsBySlug } from "@/lib/google-analytics";
import type {
  Chapter,
  ChapterSummary,
  Novel,
  NovelComment,
  RecentlyUpdatedNovel,
} from "@/types";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { formatRelativeDate } from "@/lib/utils";

type DbNovel = {
  id: string;
  slug: string;
  title: string;
  original_author: string | null;
  translator: string | null;
  description: string | null;
  cover_url: string | null;
  genres: string[];
  tags: string[];
  status: string;
  updated_at: string;
  publisher_id: string | null;
  novelupdates_url: string | null;
  language: string;
  chapters: { count: number }[];
};

const NOVEL_LIST_COLUMNS =
  "id, slug, title, original_author, translator, description, cover_url, genres, tags, status, updated_at, publisher_id, novelupdates_url, language, chapters(count)";

const NEWLY_ADDED_LIMIT = 12;

type DbChapter = {
  id: string;
  number: number;
  title: string;
  content: string;
  translator_note: string | null;
  use_global_translator_note: boolean;
  is_free: boolean;
  coin_cost: number;
  unlock_at: string | null;
  published_at: string;
};

function splitContent(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/\s+$/, ""))
    .filter((paragraph) => paragraph.trim().length > 0);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function isNaturallyFree(chapter: {
  is_free: boolean;
  unlock_at: string | null;
}): boolean {
  if (chapter.is_free) return true;
  if (chapter.unlock_at && new Date(chapter.unlock_at) <= new Date()) return true;
  return false;
}

function mapNovel(row: DbNovel): Novel {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.translator || row.original_author || "Unknown",
    originalAuthor: row.original_author ?? undefined,
    translator: row.translator ?? undefined,
    synopsis: row.description ?? "",
    coverUrl: row.cover_url ?? undefined,
    genres: row.genres as Genre[],
    tags: row.tags ?? [],
    status: row.status as Novel["status"],
    chapterCount: row.chapters?.[0]?.count ?? 0,
    updatedAt: row.updated_at,
    publisherId: row.publisher_id ?? undefined,
    novelupdatesUrl: row.novelupdates_url ?? undefined,
    language: (row.language as Language) ?? "Chinese",
  };
}

function mapChapter(
  slug: string,
  row: DbChapter,
  unlockedNumbers: Set<number>,
  bypassLock: boolean,
): Chapter {
  const naturallyFree = isNaturallyFree(row);
  const purchased = unlockedNumbers.has(row.number);
  const locked = !naturallyFree && !purchased && !bypassLock;
  const adminAccess = bypassLock && !naturallyFree && !purchased;

  return {
    id: row.id,
    novelSlug: slug,
    number: row.number,
    title: row.title,
    content: splitContent(row.content),
    translatorNote: row.translator_note?.trim() ? row.translator_note : null,
    useGlobalTranslatorNote: row.use_global_translator_note ?? true,
    publishedAt: formatDate(row.published_at),
    isFree: naturallyFree,
    isAdvanced: !row.is_free,
    coinCost: row.coin_cost,
    unlockAt: row.unlock_at,
    locked,
    adminAccess,
  };
}

async function getUnlockedChapterNumbers(
  slug: string,
): Promise<Set<number>> {
  const supabase = createClient(await cookies());
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return new Set();

  const { data } = await supabase
    .from("chapter_unlocks")
    .select("chapter_number")
    .eq("novel_slug", slug);

  return new Set((data ?? []).map((r) => r.chapter_number));
}

async function fetchNovelRows(): Promise<DbNovel[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("novels")
    .select(NOVEL_LIST_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchNovelRows:", error);
    return [];
  }
  return (data ?? []) as DbNovel[];
}

async function fetchNovelIdBySlug(
  slug: string,
): Promise<{ id: string; publisher_id: string | null } | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("novels")
    .select("id, publisher_id")
    .eq("slug", slug)
    .maybeSingle();
  return data ?? null;
}

async function fetchDbChapters(novelId: string): Promise<DbChapter[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapters")
    .select(
      "id, number, title, content, translator_note, use_global_translator_note, is_free, coin_cost, unlock_at, published_at",
    )
    .eq("novel_id", novelId)
    .eq("is_published", true)
    .order("number", { ascending: true });

  if (error) {
    console.error("fetchDbChapters:", error);
    return [];
  }
  return (data ?? []) as DbChapter[];
}

async function fetchDbChapterSummaries(
  novelId: string,
): Promise<
  Pick<
    DbChapter,
    "number" | "title" | "is_free" | "coin_cost" | "unlock_at"
  >[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapters")
    .select("number, title, is_free, coin_cost, unlock_at")
    .eq("novel_id", novelId)
    .eq("is_published", true)
    .order("number", { ascending: true });

  if (error) {
    console.error("fetchDbChapterSummaries:", error);
    return [];
  }
  return data ?? [];
}

export async function getNovels(): Promise<Novel[]> {
  const rows = await fetchNovelRows();
  return rows.map(mapNovel);
}

export async function getNovel(slug: string): Promise<Novel | undefined> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("novels")
    .select(NOVEL_LIST_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return undefined;

  const novel = mapNovel(data as DbNovel);

  if (novel.publisherId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, translator_note, kofi_url, patreon_url")
      .eq("id", novel.publisherId)
      .maybeSingle();
    if (profile?.username) {
      novel.translatorUsername = profile.username;
    }
    if (profile?.translator_note?.trim()) {
      novel.translatorGlobalNote = profile.translator_note;
    }
    if (profile?.kofi_url) {
      novel.translatorKofiUrl = profile.kofi_url;
    }
    if (profile?.patreon_url) {
      novel.translatorPatreonUrl = profile.patreon_url;
    }
  } else if (novel.translator) {
    // No publisher assigned — try to find a profile whose username matches
    // the translator name set by an admin so the name can still be linked.
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", novel.translator)
      .maybeSingle();
    if (profile?.username) {
      novel.translatorUsername = profile.username;
    }
  }

  return novel;
}

export async function getFeaturedNovels(): Promise<Novel[]> {
  const novels = await getNovels();
  if (novels.length === 0) return [];

  const viewsBySlug = await getAllTimeViewsBySlug(novels.map((n) => n.slug));

  return [...novels]
    .sort((a, b) => (viewsBySlug[b.slug] ?? 0) - (viewsBySlug[a.slug] ?? 0))
    .slice(0, 5);
}

export async function getNewlyAddedNovels(): Promise<Novel[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("novels")
    .select(NOVEL_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(NEWLY_ADDED_LIMIT);

  if (error) {
    console.error("getNewlyAddedNovels:", error);
    return [];
  }

  return ((data ?? []) as DbNovel[]).map(mapNovel);
}

type DbRecentChapterRow = {
  number: number;
  title: string;
  published_at: string;
  is_free: boolean;
  novels: { slug: string; title: string; cover_url: string | null };
};

type DbRecentChapterQueryRow = Omit<DbRecentChapterRow, "novels"> & {
  novels:
    | { slug: string; title: string; cover_url: string | null }
    | { slug: string; title: string; cover_url: string | null }[]
    | null;
};

function resolveNovelRef(
  novels: DbRecentChapterQueryRow["novels"],
): { slug: string; title: string; cover_url: string | null } | null {
  if (!novels) return null;
  return Array.isArray(novels) ? (novels[0] ?? null) : novels;
}

const RECENT_CHAPTERS_PER_NOVEL = 3;

export async function getRecentlyUpdatedNovels(): Promise<RecentlyUpdatedNovel[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapters")
    .select(
      "number, title, published_at, is_free, novels!inner(slug, title, cover_url)",
    )
    .eq("is_published", true);

  if (error) {
    console.error("getRecentlyUpdatedNovels:", error);
    return [];
  }

  type NovelAccumulator = {
    slug: string;
    title: string;
    coverUrl?: string;
    chapters: Array<{
      number: number;
      title: string;
      isAdvanced: boolean;
      publishedAt: string;
    }>;
  };

  const bySlug = new Map<string, NovelAccumulator>();

  for (const row of (data ?? []) as DbRecentChapterQueryRow[]) {
    const novel = resolveNovelRef(row.novels);
    if (!novel) continue;

    let entry = bySlug.get(novel.slug);
    if (!entry) {
      entry = {
        slug: novel.slug,
        title: novel.title,
        coverUrl: novel.cover_url ?? undefined,
        chapters: [],
      };
      bySlug.set(novel.slug, entry);
    }

    entry.chapters.push({
      number: row.number,
      title: row.title,
      isAdvanced: !row.is_free,
      publishedAt: row.published_at,
    });
  }

  return [...bySlug.values()]
    .map((entry): RecentlyUpdatedNovel | null => {
      const sorted = entry.chapters.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      const latest = sorted[0];
      if (!latest) return null;

      return {
        slug: entry.slug,
        title: entry.title,
        coverUrl: entry.coverUrl,
        recentChapters: sorted.slice(0, RECENT_CHAPTERS_PER_NOVEL).map(
          ({ number, title, isAdvanced }) => ({
            number,
            title,
            isAdvanced,
          }),
        ),
        updatedAt: latest.publishedAt,
        updatedAtLabel: formatRelativeDate(latest.publishedAt),
      };
    })
    .filter((novel): novel is RecentlyUpdatedNovel => novel !== null)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export async function getBookmarkedSlugs(): Promise<Set<string>> {
  const supabase = createClient(await cookies());
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return new Set();

  // Bookmarks are publicly readable (for /u/<username> profiles), so always
  // scope personal-library reads to the signed-in user.
  const { data, error } = await supabase
    .from("bookmarks")
    .select("novel_slug")
    .eq("user_id", auth.claims.sub);

  if (error) {
    console.error("getBookmarkedSlugs:", error);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.novel_slug));
}

export async function isNovelBookmarked(slug: string): Promise<boolean> {
  const supabase = createClient(await cookies());
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return false;

  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", auth.claims.sub)
    .eq("novel_slug", slug)
    .maybeSingle();

  return Boolean(data);
}

export async function getLibraryNovels(): Promise<Novel[]> {
  const bookmarked = await getBookmarkedSlugs();
  if (bookmarked.size === 0) return [];

  const novels = await getNovels();
  return novels.filter((novel) => bookmarked.has(novel.slug));
}

export type PublicProfile = {
  id: string;
  username: string;
  role: "user" | "translator";
};

export async function getPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("username", username)
    .maybeSingle();

  if (!data?.username) return null;
  return {
    id: data.id,
    username: data.username,
    role: data.role === "translator" ? "translator" : "user",
  };
}

export async function getUserBookmarkedNovels(
  userId: string,
): Promise<Novel[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("bookmarks")
    .select("novel_slug")
    .eq("user_id", userId);

  if (error) {
    console.error("getUserBookmarkedNovels:", error);
    return [];
  }

  const slugs = new Set((data ?? []).map((r) => r.novel_slug));
  if (slugs.size === 0) return [];

  const novels = await getNovels();
  return novels.filter((novel) => slugs.has(novel.slug));
}

export async function getUserCreatedNovels(userId: string): Promise<Novel[]> {
  // Use the admin client so chapters(count) isn't zeroed out by RLS
  // (public chapter reads go through the service role elsewhere too).
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("novels")
    .select(NOVEL_LIST_COLUMNS)
    .eq("publisher_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getUserCreatedNovels:", error);
    return [];
  }

  return ((data ?? []) as DbNovel[]).map(mapNovel);
}

export async function getChapters(slug: string): Promise<Chapter[]> {
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return [];

  const currentUser = await getCurrentUser();
  const isPublisher =
    novel.publisher_id !== null && currentUser?.id === novel.publisher_id;
  const bypassLock = currentUser?.isAdmin === true || isPublisher;

  const [rows, unlocked] = await Promise.all([
    fetchDbChapters(novel.id),
    getUnlockedChapterNumbers(slug),
  ]);

  return rows.map((row) => mapChapter(slug, row, unlocked, bypassLock));
}

export async function getChapterSummaries(
  slug: string,
): Promise<ChapterSummary[]> {
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return [];

  const currentUser = await getCurrentUser();
  const isPublisher =
    novel.publisher_id !== null && currentUser?.id === novel.publisher_id;
  const bypassLock = currentUser?.isAdmin === true || isPublisher;

  const [rows, unlocked] = await Promise.all([
    fetchDbChapterSummaries(novel.id),
    getUnlockedChapterNumbers(slug),
  ]);

  return rows.map((row) => ({
    number: row.number,
    title: row.title,
    locked:
      !isNaturallyFree(row) && !unlocked.has(row.number) && !bypassLock,
  }));
}

export async function getChapter(
  slug: string,
  chapterNumber: number,
): Promise<Chapter | undefined> {
  const chapters = await getChapters(slug);
  return chapters.find((c) => c.number === chapterNumber);
}

export async function getAdjacentChapters(slug: string, chapterNumber: number) {
  const list = await getChapters(slug);
  const index = list.findIndex((c) => c.number === chapterNumber);
  return {
    previous: index > 0 ? list[index - 1] : undefined,
    next: index >= 0 && index < list.length - 1 ? list[index + 1] : undefined,
  };
}

export async function searchNovels(query: string): Promise<Novel[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getNovels();

  const novels = await getNovels();
  return novels.filter((novel) => {
    const haystack = [
      novel.title,
      novel.author,
      novel.originalAuthor ?? "",
      novel.translator ?? "",
      novel.synopsis,
      ...novel.genres,
      ...novel.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export type NovelTitleMatch = Pick<Novel, "slug" | "title" | "coverUrl">;

function titleMatchScore(title: string, query: string): number {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle === query) return 0;
  if (lowerTitle.startsWith(query)) return 1;

  const wordIndex = lowerTitle
    .split(/\s+/)
    .findIndex((word) => word.startsWith(query));
  if (wordIndex >= 0) return 10 + wordIndex;

  const containsIndex = lowerTitle.indexOf(query);
  if (containsIndex >= 0) return 100 + containsIndex;

  return Number.POSITIVE_INFINITY;
}

export async function getClosestNovelTitleMatch(
  query: string,
): Promise<NovelTitleMatch | null> {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const novels = await getNovels();
  const [match] = novels
    .map((novel) => ({
      novel,
      score: titleMatchScore(novel.title, q),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.novel.title.length - b.novel.title.length;
    });

  if (!match) return null;
  const { slug, title, coverUrl } = match.novel;
  return { slug, title, coverUrl };
}

export async function getUserCoins(): Promise<number> {
  const supabase = createClient(await cookies());
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return 0;

  const { data } = await supabase
    .from("profiles")
    .select("coins")
    .eq("id", auth.claims.sub)
    .maybeSingle();

  return data?.coins ?? 0;
}

export async function isUserAuthenticated(): Promise<boolean> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
}

type DbCommentRow = {
  id: string;
  novel_slug: string;
  chapter_number: number | null;
  parent_id: string | null;
  body: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

const COMMENT_COLUMNS =
  "id, novel_slug, chapter_number, parent_id, body, user_id, created_at, updated_at";

type DbLikeRow = {
  comment_id: string;
  user_id: string;
};

type CurrentUser = { id: string; isAdmin: boolean; role: "user" | "translator" };

async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient(await cookies());
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return null;

  const id = auth.claims.sub as string;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();

  return {
    id,
    isAdmin: isAdminEmail(auth.claims.email as string | undefined),
    role: profile?.role === "translator" ? "translator" : "user",
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

async function fetchProfileUsernames(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const supabase = createClient(await cookies());
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

function mapCommentRows(
  rows: DbCommentRow[],
  likes: DbLikeRow[],
  usernames: Map<string, string>,
  currentUserId: string | null,
  publisherId: string | null,
): NovelComment[] {
  const likeCountByComment = new Map<string, number>();
  const likedByCurrentUser = new Set<string>();

  for (const like of likes) {
    likeCountByComment.set(
      like.comment_id,
      (likeCountByComment.get(like.comment_id) ?? 0) + 1,
    );
    if (currentUserId && like.user_id === currentUserId) {
      likedByCurrentUser.add(like.comment_id);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    novelSlug: row.novel_slug,
    chapterNumber: row.chapter_number,
    parentId: row.parent_id,
    body: row.body,
    userId: row.user_id,
    username: usernames.get(row.user_id) ?? "Unknown",
    likeCount: likeCountByComment.get(row.id) ?? 0,
    likedByCurrentUser: likedByCurrentUser.has(row.id),
    isOwn: currentUserId === row.user_id,
    isTranslatorReply:
      row.parent_id != null &&
      publisherId != null &&
      row.user_id === publisherId,
    replies: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// Fetches the publisher (translator) id for a novel so replies authored by the
// translator can be badged. Returns null when the novel or column is missing.
async function fetchNovelPublisherId(slug: string): Promise<string | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("novels")
    .select("publisher_id")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.publisher_id as string | null) ?? null;
}

async function fetchReplyRows(parentIds: string[]): Promise<DbCommentRow[]> {
  if (parentIds.length === 0) return [];

  const supabase = createClient(await cookies());
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

// Maps a page of top-level comment rows into NovelComment trees, fetching their
// replies, likes, and author usernames and nesting replies under their parent.
async function assembleCommentTree(
  slug: string,
  topLevelRows: DbCommentRow[],
  currentUserId: string | null,
): Promise<NovelComment[]> {
  const parentIds = topLevelRows.map((row) => row.id);
  const [replyRows, publisherId] = await Promise.all([
    fetchReplyRows(parentIds),
    fetchNovelPublisherId(slug),
  ]);

  const allRows = [...topLevelRows, ...replyRows];
  const userIds = [...new Set(allRows.map((row) => row.user_id))];
  const [likes, usernames] = await Promise.all([
    fetchCommentLikes(allRows.map((row) => row.id)),
    fetchProfileUsernames(userIds),
  ]);

  const mapped = mapCommentRows(
    allRows,
    likes,
    usernames,
    currentUserId,
    publisherId,
  );
  const byId = new Map(mapped.map((comment) => [comment.id, comment]));

  const topLevel: NovelComment[] = [];
  for (const comment of mapped) {
    if (comment.parentId == null) {
      topLevel.push(comment);
    } else {
      byId.get(comment.parentId)?.replies.push(comment);
    }
  }

  return topLevel;
}

async function fetchCommentLikes(commentIds: string[]): Promise<DbLikeRow[]> {
  if (commentIds.length === 0) return [];

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("novel_comment_likes")
    .select("comment_id, user_id")
    .in("comment_id", commentIds);

  if (error) {
    console.error("fetchCommentLikes:", error);
    return [];
  }

  return data ?? [];
}

export async function getChapterComments(
  slug: string,
  chapterNumber: number,
): Promise<NovelComment[]> {
  const supabase = createClient(await cookies());
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("novel_comments")
    .select(COMMENT_COLUMNS)
    .eq("novel_slug", slug)
    .eq("chapter_number", chapterNumber)
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getChapterComments:", error);
    return [];
  }

  const rows = (data ?? []) as DbCommentRow[];
  return assembleCommentTree(slug, rows, currentUserId);
}

export type NovelCommentsResult = {
  comments: NovelComment[];
  hasMore: boolean;
};

export async function getNovelComments(
  slug: string,
  options: { limit?: number; offset?: number } = {},
): Promise<NovelCommentsResult> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const supabase = createClient(await cookies());
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("novel_comments")
    .select(COMMENT_COLUMNS)
    .eq("novel_slug", slug)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    console.error("getNovelComments:", error);
    return { comments: [], hasMore: false };
  }

  const rows = (data ?? []) as DbCommentRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    comments: await assembleCommentTree(slug, pageRows, currentUserId),
    hasMore,
  };
}

export type ReadableChapter = {
  number: number;
  title: string;
};

export async function getReadableChapters(
  slug: string,
): Promise<ReadableChapter[]> {
  const chapters = await getChapters(slug);
  return chapters
    .filter((chapter) => !chapter.locked)
    .map((chapter) => ({
      number: chapter.number,
      title: chapter.title,
    }));
}

export async function isChapterReadable(
  slug: string,
  chapterNumber: number,
): Promise<boolean> {
  const chapter = await getChapter(slug, chapterNumber);
  return Boolean(chapter && !chapter.locked);
}
