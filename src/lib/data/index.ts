import { cookies } from "next/headers";

import type { Genre, Language } from "@/lib/constants";
import { getAllTimeViewsBySlug } from "@/lib/google-analytics";
import type {
  Chapter,
  ChapterListItem,
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

const NEWLY_ADDED_LIMIT = 7;
const UNDERRATED_LIMIT = 7;
const COMPLETED_LIMIT = 7;
const FEATURED_LIMIT = 7;

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

type DbChapterMeta = Omit<DbChapter, "content">;

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
  const listItem = mapChapterListItem(slug, row, unlockedNumbers, bypassLock);
  return {
    ...listItem,
    content: splitContent(row.content),
  };
}

function mapChapterListItem(
  slug: string,
  row: DbChapterMeta,
  unlockedNumbers: Set<number>,
  bypassLock: boolean,
): ChapterListItem {
  const naturallyFree = isNaturallyFree(row);
  const purchased = unlockedNumbers.has(row.number);
  const locked = !naturallyFree && !purchased && !bypassLock;
  const adminAccess = bypassLock && !naturallyFree && !purchased;

  return {
    id: row.id,
    novelSlug: slug,
    number: row.number,
    title: row.title,
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

async function fetchDbChapterMetas(novelId: string): Promise<DbChapterMeta[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapters")
    .select(
      "id, number, title, translator_note, use_global_translator_note, is_free, coin_cost, unlock_at, published_at",
    )
    .eq("novel_id", novelId)
    .eq("is_published", true)
    .order("number", { ascending: true });

  if (error) {
    console.error("fetchDbChapterMetas:", error);
    return [];
  }
  return (data ?? []) as DbChapterMeta[];
}

async function fetchDbChapter(
  novelId: string,
  chapterNumber: number,
): Promise<DbChapter | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapters")
    .select(
      "id, number, title, content, translator_note, use_global_translator_note, is_free, coin_cost, unlock_at, published_at",
    )
    .eq("novel_id", novelId)
    .eq("number", chapterNumber)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("fetchDbChapter:", error);
    return null;
  }
  return (data as DbChapter | null) ?? null;
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

export async function getFeaturedNovels(
  novels?: Novel[],
): Promise<Novel[]> {
  const catalog = novels ?? (await getNovels());
  if (catalog.length === 0) return [];

  const viewsBySlug = await getAllTimeViewsBySlug(catalog.map((n) => n.slug));

  return [...catalog]
    .sort((a, b) => (viewsBySlug[b.slug] ?? 0) - (viewsBySlug[a.slug] ?? 0))
    .slice(0, FEATURED_LIMIT);
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

function shuffleNovels(novels: Novel[]): Novel[] {
  const items = [...novels];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = items[i]!;
    items[i] = items[j]!;
    items[j] = current;
  }
  return items;
}

/** Random novels excluding featured and newly-added picks. */
export async function getUnderratedNovels(
  excludeSlugs: Iterable<string>,
  limit = UNDERRATED_LIMIT,
  novels?: Novel[],
): Promise<Novel[]> {
  const excluded = new Set(excludeSlugs);
  const catalog = novels ?? (await getNovels());
  const pool = catalog.filter((novel) => !excluded.has(novel.slug));
  return shuffleNovels(pool).slice(0, limit);
}

export async function getCompletedNovels(
  novels?: Novel[],
  limit = COMPLETED_LIMIT,
): Promise<Novel[]> {
  const catalog = novels ?? (await getNovels());
  return [...catalog]
    .filter((novel) => novel.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, limit);
}

type DbRecentChapterRpcRow = {
  novel_slug: string;
  novel_title: string;
  cover_url: string | null;
  chapter_number: number;
  chapter_title: string;
  is_free: boolean;
  published_at: string;
};

const RECENT_CHAPTERS_PER_NOVEL = 3;

export async function getRecentlyUpdatedNovels(): Promise<RecentlyUpdatedNovel[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("recently_updated_chapters", {
    per_novel: RECENT_CHAPTERS_PER_NOVEL,
  });

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

  for (const row of (data ?? []) as DbRecentChapterRpcRow[]) {
    let entry = bySlug.get(row.novel_slug);
    if (!entry) {
      entry = {
        slug: row.novel_slug,
        title: row.novel_title,
        coverUrl: row.cover_url ?? undefined,
        chapters: [],
      };
      bySlug.set(row.novel_slug, entry);
    }

    if (entry.chapters.length >= RECENT_CHAPTERS_PER_NOVEL) continue;

    entry.chapters.push({
      number: row.chapter_number,
      title: row.chapter_title,
      isAdvanced: !row.is_free,
      publishedAt: row.published_at,
    });
  }

  return [...bySlug.values()]
    .map((entry): RecentlyUpdatedNovel | null => {
      const latest = entry.chapters[0];
      if (!latest) return null;

      return {
        slug: entry.slug,
        title: entry.title,
        coverUrl: entry.coverUrl,
        recentChapters: entry.chapters.map(({ number, title, isAdvanced }) => ({
          number,
          title,
          isAdvanced,
        })),
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
  avatarUrl: string | null;
  kofiUrl: string | null;
  patreonUrl: string | null;
};

export async function getPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("profiles")
    .select("id, username, role, avatar_url, kofi_url, patreon_url")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (!data?.username) return null;
  return {
    id: data.id,
    username: data.username,
    role: data.role === "translator" ? "translator" : "user",
    avatarUrl: data.avatar_url?.trim() || null,
    kofiUrl: data.kofi_url?.trim() || null,
    patreonUrl: data.patreon_url?.trim() || null,
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

/** Chapter list/TOC metadata without body content. */
export async function getChapterListItems(
  slug: string,
): Promise<ChapterListItem[]> {
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return [];

  const currentUser = await getCurrentUser();
  const isPublisher =
    novel.publisher_id !== null && currentUser?.id === novel.publisher_id;
  const bypassLock = currentUser?.isAdmin === true || isPublisher;

  const [rows, unlocked] = await Promise.all([
    fetchDbChapterMetas(novel.id),
    getUnlockedChapterNumbers(slug),
  ]);

  return rows.map((row) =>
    mapChapterListItem(slug, row, unlocked, bypassLock),
  );
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
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return undefined;

  const currentUser = await getCurrentUser();
  const isPublisher =
    novel.publisher_id !== null && currentUser?.id === novel.publisher_id;
  const bypassLock = currentUser?.isAdmin === true || isPublisher;

  const [row, unlocked] = await Promise.all([
    fetchDbChapter(novel.id, chapterNumber),
    getUnlockedChapterNumbers(slug),
  ]);
  if (!row) return undefined;

  return mapChapter(slug, row, unlocked, bypassLock);
}

export async function getAdjacentChapters(
  slug: string,
  chapterNumber: number,
): Promise<{
  previous?: Pick<ChapterSummary, "number">;
  next?: Pick<ChapterSummary, "number">;
}> {
  const list = await getChapterSummaries(slug);
  const index = list.findIndex((c) => c.number === chapterNumber);
  return {
    previous: index > 0 ? { number: list[index - 1]!.number } : undefined,
    next:
      index >= 0 && index < list.length - 1
        ? { number: list[index + 1]!.number }
        : undefined,
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
): Promise<AccountComment[]> {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("novel_comments")
    .select(COMMENT_COLUMNS)
    .eq("user_id", userId)
    .is("parent_id", null)
    .order("created_at", { ascending: false });

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

export async function getReadableChapters(
  slug: string,
): Promise<ReadableChapter[]> {
  const chapters = await getChapterSummaries(slug);
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
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return false;

  const currentUser = await getCurrentUser();
  const isPublisher =
    novel.publisher_id !== null && currentUser?.id === novel.publisher_id;
  if (currentUser?.isAdmin === true || isPublisher) return true;

  const admin = createAdminClient();
  const [{ data: row }, unlocked] = await Promise.all([
    admin
      .from("chapters")
      .select("number, is_free, unlock_at")
      .eq("novel_id", novel.id)
      .eq("number", chapterNumber)
      .eq("is_published", true)
      .maybeSingle(),
    getUnlockedChapterNumbers(slug),
  ]);

  if (!row) return false;
  return isNaturallyFree(row) || unlocked.has(chapterNumber);
}
