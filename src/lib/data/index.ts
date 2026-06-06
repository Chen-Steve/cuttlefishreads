import { cookies } from "next/headers";

import type { Genre } from "@/lib/constants";
import type { Chapter, ChapterSummary, Novel, NovelComment } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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
  chapters: { count: number }[];
};

type DbChapter = {
  id: string;
  number: number;
  title: string;
  content: string;
  is_free: boolean;
  coin_cost: number;
  unlock_at: string | null;
  published_at: string;
};

function splitContent(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\n+/)
    .map((paragraph) => paragraph.replace(/\s+$/, ""))
    .filter((paragraph) => paragraph.trim().length > 0);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
  };
}

function mapChapter(
  slug: string,
  row: DbChapter,
  unlockedNumbers: Set<number>,
): Chapter {
  const naturallyFree = isNaturallyFree(row);
  const locked = !naturallyFree && !unlockedNumbers.has(row.number);

  return {
    id: row.id,
    novelSlug: slug,
    number: row.number,
    title: row.title,
    content: splitContent(row.content),
    publishedAt: formatDate(row.published_at),
    isFree: naturallyFree,
    coinCost: row.coin_cost,
    unlockAt: row.unlock_at,
    locked,
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
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("novels")
    .select(
      "id, slug, title, original_author, translator, description, cover_url, genres, tags, status, updated_at, chapters(count)",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchNovelRows:", error);
    return [];
  }
  return (data ?? []) as DbNovel[];
}

async function fetchNovelIdBySlug(slug: string): Promise<string | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("novels")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

async function fetchDbChapters(novelId: string): Promise<DbChapter[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapters")
    .select(
      "id, number, title, content, is_free, coin_cost, unlock_at, published_at",
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
    .select(
      "id, slug, title, original_author, translator, description, cover_url, genres, tags, status, updated_at, chapters(count)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapNovel(data as DbNovel);
}

export async function getFeaturedNovels(): Promise<Novel[]> {
  const novels = await getNovels();
  return novels.slice(0, 3);
}

export async function getBookmarkedSlugs(): Promise<Set<string>> {
  const supabase = createClient(await cookies());
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return new Set();

  const { data, error } = await supabase
    .from("bookmarks")
    .select("novel_slug");

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
};

export async function getPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (!data?.username) return null;
  return { id: data.id, username: data.username };
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

export async function getChapters(slug: string): Promise<Chapter[]> {
  const novelId = await fetchNovelIdBySlug(slug);
  if (!novelId) return [];

  const [rows, unlocked] = await Promise.all([
    fetchDbChapters(novelId),
    getUnlockedChapterNumbers(slug),
  ]);

  return rows.map((row) => mapChapter(slug, row, unlocked));
}

export async function getChapterSummaries(
  slug: string,
): Promise<ChapterSummary[]> {
  const novelId = await fetchNovelIdBySlug(slug);
  if (!novelId) return [];

  const [rows, unlocked] = await Promise.all([
    fetchDbChapterSummaries(novelId),
    getUnlockedChapterNumbers(slug),
  ]);

  return rows.map((row) => ({
    number: row.number,
    title: row.title,
    locked:
      !isNaturallyFree(row) && !unlocked.has(row.number),
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
  body: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type DbLikeRow = {
  comment_id: string;
  user_id: string;
};

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient(await cookies());
  const { data: auth } = await supabase.auth.getClaims();
  return auth?.claims?.sub ?? null;
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
    body: row.body,
    userId: row.user_id,
    username: usernames.get(row.user_id) ?? "Unknown",
    likeCount: likeCountByComment.get(row.id) ?? 0,
    likedByCurrentUser: likedByCurrentUser.has(row.id),
    isOwn: currentUserId === row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
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
    .select(
      "id, novel_slug, chapter_number, body, user_id, created_at, updated_at",
    )
    .eq("novel_slug", slug)
    .eq("chapter_number", chapterNumber)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getChapterComments:", error);
    return [];
  }

  const rows = (data ?? []) as DbCommentRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const [likes, usernames] = await Promise.all([
    fetchCommentLikes(rows.map((row) => row.id)),
    fetchProfileUsernames(userIds),
  ]);
  return mapCommentRows(rows, likes, usernames, currentUserId);
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
    .select(
      "id, novel_slug, chapter_number, body, user_id, created_at, updated_at",
    )
    .eq("novel_slug", slug)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    console.error("getNovelComments:", error);
    return { comments: [], hasMore: false };
  }

  const rows = (data ?? []) as DbCommentRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const userIds = [...new Set(pageRows.map((row) => row.user_id))];
  const [likes, usernames] = await Promise.all([
    fetchCommentLikes(pageRows.map((row) => row.id)),
    fetchProfileUsernames(userIds),
  ]);

  return {
    comments: mapCommentRows(pageRows, likes, usernames, currentUserId),
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
