import { cache } from "react";
import { unstable_cache, revalidateTag, cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import {
  COMMENTS_PAGE_SIZE, REPLIES_PAGE_SIZE, commentCursorFilter,
  validateCommentCursor, type CommentCursor,
} from "@/lib/comment-pagination";
import { findClosestNovelTitle, type NovelTitleMatch } from "@/lib/novel-title-search";
import {
  novelChaptersCacheTag,
  novelChapterBodiesCacheTag,
  chapterBodyCacheTag,
  NOVEL_DETAILS_CACHE_TAG,
  novelDetailCacheTag,
} from "@/lib/chapter-cache-tags";

export { novelChaptersCacheTag } from "@/lib/chapter-cache-tags";

import type { Genre, Language } from "@/lib/constants";
import {
  hasProfileRole,
  parseProfileRoles,
  type ProfileRole,
} from "@/lib/roles";
import type {
  Chapter,
  ChapterListItem,
  ChapterListRow,
  ChapterLockUpdate,
  ChapterSummary,
  Novel,
  NovelComment,
  NovelRatingSummary,
  RecentlyUpdatedNovel,
} from "@/types";
import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSessionProfile } from "@/lib/session-profile";
import {
  CHAPTER_LIST_PAGE_SIZE,
  type ChapterListOrder,
} from "@/lib/chapter-list-page";
import { formatRelativeDate } from "@/lib/utils";

type DbNovel = {
  id: string;
  slug: string;
  title: string;
  original_author: string | null;
  translator: string | null;
  description?: string | null;
  cover_url: string | null;
  genres: string[];
  tags: string[];
  status: string;
  updated_at: string;
  publisher_id: string | null;
  novelupdates_url: string | null;
  language: string;
  created_at: string;
  view_count?: number | null;
  library_add_count?: number | null;
  chapters: { count: number }[];
};

/** Catalog cards / carousels — no synopsis. */
const NOVEL_LIST_COLUMNS =
  "id, slug, title, original_author, translator, cover_url, genres, tags, status, created_at, updated_at, publisher_id, novelupdates_url, language, view_count, library_add_count, chapters(count)";

/** Novel detail, featured, metadata — includes synopsis. */
const NOVEL_DETAIL_COLUMNS = `${NOVEL_LIST_COLUMNS}, description`;

// Notes stay off this shared list. A chapter page only needs the open
// chapter's note, which is loaded with that chapter's body.
const CHAPTER_META_COLUMNS =
  "id, number, title, use_global_translator_note, is_free, coin_cost, unlock_at, published_at";

const NEWLY_ADDED_LIMIT = 7;
const UNDERRATED_LIMIT = 7;
const COMPLETED_LIMIT = 7;
const FEATURED_LIMIT = 7;

type DbChapterMeta = {
  id: string;
  number: number;
  title: string;
  use_global_translator_note: boolean;
  is_free: boolean;
  coin_cost: number;
  unlock_at: string | null;
  published_at: string;
};

type DbChapterBody = {
  content: string | null;
  translatorNote: string | null;
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

export function isNaturallyFree(chapter: {
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
    viewCount: Number(row.view_count ?? 0),
    libraryAddCount: Number(row.library_add_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publisherId: row.publisher_id ?? undefined,
    novelupdatesUrl: row.novelupdates_url ?? undefined,
    language: (row.language as Language) ?? "Chinese",
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
    publishedAt: formatDate(row.published_at),
    isFree: naturallyFree,
    isAdvanced: !row.is_free,
    coinCost: row.coin_cost,
    unlockAt: row.unlock_at,
    locked,
    adminAccess,
  };
}

function toChapter(
  row: DbChapterMeta,
  item: ChapterListItem,
  content?: string[],
  translatorNote?: string | null,
): Chapter {
  return {
    ...item,
    translatorNote: translatorNote?.trim() ? translatorNote : null,
    useGlobalTranslatorNote: row.use_global_translator_note ?? true,
    ...(content ? { content } : {}),
  };
}

type CurrentUser = {
  id: string;
  isAdmin: boolean;
  roles: ProfileRole[];
  role: "user" | "translator";
};

/** Request-scoped current user (auth claims + profile roles). */
const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSessionProfile();
  if (!session) return null;

  return {
    id: session.id,
    isAdmin: session.isAdmin,
    roles: session.roles,
    role: session.isTranslator ? "translator" : "user",
  };
});

/** Request-scoped unlock set for a novel. */
const getUnlockedChapterNumbers = cache(
  async (slug: string): Promise<Set<number>> => {
    const claims = await getAuthClaims();
    if (!claims) return new Set();

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("chapter_unlocks")
      .select("chapter_number")
      .eq("user_id", claims.sub)
      .eq("novel_slug", slug);

    if (error) throw new Error("Could not load chapter unlocks", { cause: error });
    return new Set((data ?? []).map((r) => r.chapter_number));
  },
);

// Request-scoped only: never share a reader's entitlement across requests.
const hasChapterUnlock = cache(
  async (slug: string, chapterNumber: number, userId: string): Promise<boolean> => {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from("chapter_unlocks")
      .select("chapter_number")
      .eq("user_id", userId)
      .eq("novel_slug", slug)
      .eq("chapter_number", chapterNumber)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("Could not check chapter access", { cause: error });
    return data != null;
  },
);

/** Tags for cross-request catalog caches (invalidate from admin mutations). */
export const NOVELS_CATALOG_CACHE_TAG = "novels-catalog";
export const RECENTLY_UPDATED_NOVELS_CACHE_TAG = "recently-updated-novels";
/** Rating averages (busted when a rated comment is created/removed). */
export const NOVEL_RATINGS_CACHE_TAG = "novel-ratings";
/** Comment trees for one novel (all chapters). Bust with `updateTag`. */
export function novelCommentsCacheTag(slug: string): string {
  return `novel-comments:${slug}`;
}
/** Public profile row for /u/<username>. */
export function profileCacheTag(username: string): string {
  return `profile:${username.trim().toLowerCase()}`;
}
/** Bookmarked novel slugs for one user. */
export function userBookmarksCacheTag(userId: string): string {
  return `bookmarks:${userId}`;
}

const CATALOG_REVALIDATE_SECONDS = 60 * 5;
// Chapters only change through workspace actions, which bust by tag.
const CHAPTER_REVALIDATE_SECONDS = 60 * 60 * 24;
const COMMENTS_REVALIDATE_SECONDS = 60 * 15;

/**
 * Refresh public catalog caches. Chapter access and bodies are expired
 * separately by workspace actions, without stale-while-revalidate.
 */
export function revalidateNovelsDataCache(includeDetails = false) {
  revalidateTag(NOVELS_CATALOG_CACHE_TAG, "max");
  revalidateTag(RECENTLY_UPDATED_NOVELS_CACHE_TAG, "max");
  if (includeDetails) revalidateTag(NOVEL_DETAILS_CACHE_TAG, "max");
}

const fetchNovelRows = unstable_cache(
  async (): Promise<DbNovel[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("novels")
      .select(NOVEL_LIST_COLUMNS)
      .eq("publication_type", "translation")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error("fetchNovelRows failed", { cause: error });
    }
    // view_count is mirrored from GA4 by the daily cron. Public pages must
    // not call the Analytics API themselves.
    return (data ?? []) as DbNovel[];
  },
  ["novels-catalog-rows-v3"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [NOVELS_CATALOG_CACHE_TAG],
  },
);

async function fetchDbChapterMetas(novelId: string): Promise<DbChapterMeta[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("chapters")
        .select(CHAPTER_META_COLUMNS)
        .eq("novel_id", novelId)
        .eq("is_published", true)
        .order("number", { ascending: true });

      if (error) {
        throw new Error("Could not load chapter metadata", { cause: error });
      }
      return (data ?? []) as DbChapterMeta[];
    },
    ["chapter-metas-v2", novelId],
    {
      revalidate: CHAPTER_REVALIDATE_SECONDS,
      tags: [novelChaptersCacheTag(novelId)],
    },
  )();
}

async function fetchDbChapterMeta(
  novelId: string,
  chapterNumber: number,
): Promise<DbChapterMeta | null> {
  const rows = await fetchDbChapterMetas(novelId);
  return rows.find((row) => row.number === chapterNumber) ?? null;
}

export type PublicChapterMeta = {
  number: number;
  title: string;
  /** Explicitly free; timed releases stay in the request-time reader. */
  isFree: boolean;
};

/**
 * Chapter title + public lock state from cached metadata only. No auth or
 * per-user unlock lookups — for `generateMetadata` and other visitor-agnostic
 * paths.
 */
export async function getPublicChapterMeta(
  slug: string,
  chapterNumber: number,
): Promise<PublicChapterMeta | null> {
  "use cache";
  // A nonzero client lifetime lets a full next-chapter prefetch resolve this
  // metadata before navigation. Mutations still invalidate the chapter tag.
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return null;
  cacheTag(novelChaptersCacheTag(novel.id));
  const row = await fetchDbChapterMeta(novel.id, chapterNumber);
  if (!row) return null;
  return {
    number: row.number,
    title: row.title,
    isFree: row.is_free,
  };
}

async function fetchDbChapterContent(
  novelId: string,
  chapterNumber: number,
): Promise<DbChapterBody | null> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("chapters")
        .select("content, translator_note")
        .eq("novel_id", novelId)
        .eq("number", chapterNumber)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        throw new Error("Could not load chapter content", { cause: error });
      }
      if (!data) return null;
      const note = (data.translator_note as string | null | undefined)?.trim();
      return {
        content: (data.content as string | null | undefined) ?? null,
        translatorNote: note ? note : null,
      };
    },
    ["chapter-body-v3", novelId, String(chapterNumber)],
    {
      revalidate: CHAPTER_REVALIDATE_SECONDS,
      tags: [
        chapterBodyCacheTag(novelId, chapterNumber),
        novelChapterBodiesCacheTag(novelId),
      ],
    },
  )();
}

export const getNovels = cache(async (): Promise<Novel[]> => {
  const rows = await fetchNovelRows();
  return rows.map(mapNovel);
});

async function fetchPublisherFields(novel: Novel): Promise<Novel> {
  const admin = createAdminClient();

  if (novel.publisherId) {
    const { data: profile, error } = await admin
      .from("profiles")
      .select("username, translator_note, kofi_url, patreon_url")
      .eq("id", novel.publisherId)
      .maybeSingle();
    if (error) throw new Error("Could not load publisher profile", { cause: error });
    if (profile?.username) novel.translatorUsername = profile.username;
    if (profile?.translator_note?.trim()) {
      novel.translatorGlobalNote = profile.translator_note;
    }
    if (profile?.kofi_url) novel.translatorKofiUrl = profile.kofi_url;
    if (profile?.patreon_url) novel.translatorPatreonUrl = profile.patreon_url;
    return novel;
  }

  if (novel.translator) {
    const { data: profile, error } = await admin
      .from("profiles")
      .select("username")
      .eq("username", novel.translator)
      .maybeSingle();
    if (error) throw new Error("Could not load publisher profile", { cause: error });
    if (profile?.username) novel.translatorUsername = profile.username;
  }

  return novel;
}

async function loadCachedNovel(slug: string): Promise<Novel | undefined> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("novels")
        .select(NOVEL_DETAIL_COLUMNS)
        .eq("slug", slug)
        .eq("publication_type", "translation")
        .maybeSingle();

      if (error) throw new Error("Could not load novel", { cause: error });
      if (!data) return undefined;
      return fetchPublisherFields(mapNovel(data as DbNovel));
    },
    ["novel-detail-v2", slug],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [NOVEL_DETAILS_CACHE_TAG, novelDetailCacheTag(slug)],
    },
  )();
}

export const getNovel = cache(
  async (slug: string): Promise<Novel | undefined> => loadCachedNovel(slug),
);

/** Novel id (+ publisher) by slug — shared with getNovel's cross-request cache. */
const fetchNovelIdBySlug = cache(async (slug: string) => {
  const novel = await getNovel(slug);
  if (!novel) return null;
  return { id: novel.id, publisher_id: novel.publisherId ?? null };
});

async function fetchNovelSynopses(
  slugs: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(slugs.filter(Boolean))].sort();
  if (unique.length === 0) return {};

  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("novels")
        .select("slug, description")
        .in("slug", unique);

      if (error) {
        throw new Error("fetchNovelSynopses failed", { cause: error });
      }

      const synopses: Record<string, string> = {};
      for (const row of data ?? []) {
        synopses[row.slug as string] = (row.description as string | null) ?? "";
      }
      return synopses;
    },
    ["novel-synopses", unique.join("|")],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [NOVELS_CATALOG_CACHE_TAG],
    },
  )();
}

/**
 * Homepage featured ranking. View totals are already on the catalog rows
 * (mirrored from GA4 when that cache refreshes).
 */
export async function getFeaturedNovels(
  novels?: Novel[],
): Promise<Novel[]> {
  const catalog = novels ?? (await getNovels());
  if (catalog.length === 0) return [];

  const ranked = [...catalog]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, FEATURED_LIMIT);

  const synopses = await fetchNovelSynopses(ranked.map((novel) => novel.slug));
  return ranked.map((novel) => ({
    ...novel,
    synopsis: synopses[novel.slug] ?? "",
  }));
}

export async function getNewlyAddedNovels(
  novels?: Novel[],
): Promise<Novel[]> {
  const catalog = novels ?? (await getNovels());
  return [...catalog]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, NEWLY_ADDED_LIMIT);
}

/** Below this, a novel only fills an underrated slot after longer works. */
const UNDERRATED_CHAPTER_FLOOR = 5;

function compareUnderrated(a: Novel, b: Novel): number {
  const score =
    (a.viewCount ?? 0) / a.chapterCount - (b.viewCount ?? 0) / b.chapterCount;
  if (score !== 0) return score;
  const chapters = b.chapterCount - a.chapterCount;
  if (chapters !== 0) return chapters;
  const saved = (b.libraryAddCount ?? 0) - (a.libraryAddCount ?? 0);
  if (saved !== 0) return saved;
  const created =
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (created !== 0) return created;
  return a.slug.localeCompare(b.slug);
}

function rankUnderratedPool(novels: Novel[], minChapters: number): Novel[] {
  return novels
    .filter((novel) => novel.chapterCount >= minChapters)
    .sort(compareUnderrated);
}

/**
 * Overlooked translations: few views for the number of chapters, excluding
 * novels already shown in Featured and Newly added. Longer works come first.
 */
export async function getUnderratedNovels(
  excludeSlugs: Iterable<string>,
  limit = UNDERRATED_LIMIT,
  novels?: Novel[],
): Promise<Novel[]> {
  const excluded = new Set(excludeSlugs);
  const catalog = novels ?? (await getNovels());
  const pool = catalog.filter((novel) => !excluded.has(novel.slug));
  const primary = rankUnderratedPool(pool, UNDERRATED_CHAPTER_FLOOR);
  if (primary.length >= limit) return primary.slice(0, limit);
  const filler = rankUnderratedPool(
    pool.filter((novel) => novel.chapterCount < UNDERRATED_CHAPTER_FLOOR),
    1,
  );
  return [...primary, ...filler].slice(0, limit);
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

type CachedRecentlyUpdatedNovel = Omit<RecentlyUpdatedNovel, "updatedAtLabel">;

const loadRecentlyUpdatedNovels = unstable_cache(
  async (): Promise<CachedRecentlyUpdatedNovel[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("recently_updated_chapters", {
      per_novel: RECENT_CHAPTERS_PER_NOVEL,
    });

    if (error) {
      throw new Error("getRecentlyUpdatedNovels failed", { cause: error });
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
      .map((entry): CachedRecentlyUpdatedNovel | null => {
        const latest = entry.chapters[0];
        if (!latest) return null;

        return {
          slug: entry.slug,
          title: entry.title,
          coverUrl: entry.coverUrl,
          recentChapters: entry.chapters.map(
            ({ number, title, isAdvanced }) => ({
              number,
              title,
              isAdvanced,
            }),
          ),
          updatedAt: latest.publishedAt,
        };
      })
      .filter((novel): novel is CachedRecentlyUpdatedNovel => novel !== null)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  },
  ["recently-updated-novels"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [RECENTLY_UPDATED_NOVELS_CACHE_TAG],
  },
);

export const getRecentlyUpdatedNovels = cache(
  async (): Promise<RecentlyUpdatedNovel[]> => {
    const [rows, catalog] = await Promise.all([
      loadRecentlyUpdatedNovels(),
      getNovels(),
    ]);
    const allowed = new Set(catalog.map((novel) => novel.slug));
    // Relative labels stay request-fresh; only the RPC payload is cached.
    return rows
      .filter((novel) => allowed.has(novel.slug))
      .map((novel) => ({
        ...novel,
        updatedAtLabel: formatRelativeDate(novel.updatedAt),
      }));
  },
);

/**
 * Bookmarked slugs for one user. Bookmarks are publicly readable (for
 * /u/<username> profiles), so the service role sees the same rows. Bookmark
 * mutations call `updateTag(userBookmarksCacheTag(userId))`.
 */
async function fetchUserBookmarkSlugs(userId: string): Promise<string[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("bookmarks")
        .select("novel_slug")
        .eq("user_id", userId);

      if (error) {
        throw new Error("fetchUserBookmarkSlugs failed", { cause: error });
      }
      return (data ?? []).map((r) => r.novel_slug as string);
    },
    ["user-bookmark-slugs", userId],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [userBookmarksCacheTag(userId)],
    },
  )();
}

export const getBookmarkedSlugs = cache(async (): Promise<Set<string>> => {
  const claims = await getAuthClaims();
  if (!claims) return new Set();
  return new Set(await fetchUserBookmarkSlugs(claims.sub));
});

export const isNovelBookmarked = cache(
  async (slug: string): Promise<boolean> => {
    const bookmarked = await getBookmarkedSlugs();
    return bookmarked.has(slug);
  },
);

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
  roles: ProfileRole[];
  isTranslator: boolean;
  avatarUrl: string | null;
  kofiUrl: string | null;
  patreonUrl: string | null;
};

type DbPublicProfile = {
  id: string;
  username: string | null;
  role: string | null;
  avatar_url: string | null;
  kofi_url: string | null;
  patreon_url: string | null;
};

async function fetchPublicProfileRow(
  username: string,
): Promise<DbPublicProfile | null> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("profiles")
        .select("id, username, role, avatar_url, kofi_url, patreon_url")
        .eq("username", username)
        .maybeSingle();

      if (error) throw new Error("Could not load public profile", { cause: error });
      return (data as DbPublicProfile | null) ?? null;
    },
    ["public-profile", username],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [profileCacheTag(username)],
    },
  )();
}

export const getPublicProfile = cache(async (
  username: string,
): Promise<PublicProfile | null> => {
  const data = await fetchPublicProfileRow(username.trim().toLowerCase());

  if (!data?.username) return null;
  const roles = parseProfileRoles({
    role: data.role as string | null | undefined,
  });
  const isTranslator = hasProfileRole(roles, "translator");
  return {
    id: data.id,
    username: data.username,
    role: isTranslator ? "translator" : "user",
    roles,
    isTranslator,
    avatarUrl: data.avatar_url?.trim() || null,
    kofiUrl: data.kofi_url?.trim() || null,
    patreonUrl: data.patreon_url?.trim() || null,
  };
});

export async function getUserBookmarkedNovels(
  userId: string,
): Promise<Novel[]> {
  const slugs = new Set(await fetchUserBookmarkSlugs(userId));
  if (slugs.size === 0) return [];

  const novels = await getNovels();
  return novels.filter((novel) => slugs.has(novel.slug));
}

export async function getUserCreatedNovels(userId: string): Promise<Novel[]> {
  const novels = await getNovels();
  return novels.filter((novel) => novel.publisherId === userId);
}

function toChapterListRow(item: ChapterListItem): ChapterListRow {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    publishedAt: item.publishedAt,
    isFree: item.isFree,
    isAdvanced: item.isAdvanced,
    coinCost: item.coinCost,
    unlockAt: item.unlockAt,
    locked: item.locked,
    adminAccess: item.adminAccess,
  };
}

function sliceChapterMetas(
  rows: DbChapterMeta[],
  page: number,
  order: ChapterListOrder,
): DbChapterMeta[] {
  const start = page * CHAPTER_LIST_PAGE_SIZE;
  if (start >= rows.length) return [];
  const ordered = order === "newest" ? [...rows].reverse() : rows;
  return ordered.slice(start, start + CHAPTER_LIST_PAGE_SIZE);
}

export type PublicChapterListPage = {
  chapters: ChapterListRow[];
  totalCount: number;
};

/**
 * One page of the public chapter list. No auth or unlock lookup.
 * The novel page renders the first oldest page; other pages load on demand.
 */
export async function getPublicChapterListPage(
  slug: string,
  page: number,
  order: ChapterListOrder,
): Promise<PublicChapterListPage> {
  "use cache";
  cacheLife({ stale: 0, revalidate: 300, expire: 3600 });
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return { chapters: [], totalCount: 0 };
  cacheTag(novelChaptersCacheTag(novel.id));
  if (!Number.isSafeInteger(page) || page < 0) {
    return { chapters: [], totalCount: 0 };
  }

  const rows = await fetchDbChapterMetas(novel.id);
  const unlocked = new Set<number>();
  return {
    chapters: sliceChapterMetas(rows, page, order).map((row) =>
      toChapterListRow(mapChapterListItem(slug, row, unlocked, false)),
    ),
    totalCount: rows.length,
  };
}

/** Chapter list/TOC metadata without body content. */
export const getChapterListItems = cache(
  async (slug: string): Promise<ChapterListItem[]> => {
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
  },
);

/**
 * Lock flags that differ from the public page. Empty when that page is
 * already correct, so anonymous visits do not stream a second list.
 */
export const getChapterListLockUpdates = cache(
  async (
    slug: string,
    page: number,
    order: ChapterListOrder,
  ): Promise<ChapterLockUpdate[]> => {
    const novel = await fetchNovelIdBySlug(slug);
    if (!novel) return [];
    if (!Number.isSafeInteger(page) || page < 0) return [];

    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    const isPublisher =
      novel.publisher_id !== null && currentUser.id === novel.publisher_id;
    const bypassLock = currentUser.isAdmin || isPublisher;
    const unlocked = bypassLock
      ? new Set<number>()
      : await getUnlockedChapterNumbers(slug);
    if (!bypassLock && unlocked.size === 0) return [];

    const rows = await fetchDbChapterMetas(novel.id);
    const publicUnlocked = new Set<number>();
    const updates: ChapterLockUpdate[] = [];
    for (const row of sliceChapterMetas(rows, page, order)) {
      const publicItem = mapChapterListItem(slug, row, publicUnlocked, false);
      const personal = mapChapterListItem(slug, row, unlocked, bypassLock);
      if (
        publicItem.locked === personal.locked &&
        publicItem.adminAccess === personal.adminAccess
      ) {
        continue;
      }
      updates.push({
        id: personal.id,
        locked: personal.locked,
        adminAccess: personal.adminAccess,
      });
    }
    return updates;
  },
);

/** TOC rows with public lock state only. No auth or unlock lookup. */
export const getPublicChapterSummaries = cache(
  async (slug: string): Promise<ChapterSummary[]> => {
    const novel = await fetchNovelIdBySlug(slug);
    if (!novel) return [];

    const rows = await fetchDbChapterMetas(novel.id);
    return rows.map((row) => ({
      number: row.number,
      title: row.title,
      locked: !isNaturallyFree(row),
    }));
  },
);

/** Previous and next chapter numbers. Stays on the server; the contents menu loads the full list on open. */
export const getPublicChapterNeighbors = cache(
  async (
    slug: string,
    chapterNumber: number,
  ): Promise<{ previous?: number; next?: number }> => {
    const novel = await fetchNovelIdBySlug(slug);
    if (!novel) return {};

    const rows = await fetchDbChapterMetas(novel.id);
    const index = rows.findIndex((row) => row.number === chapterNumber);
    if (index < 0) return {};

    return {
      previous: index > 0 ? rows[index - 1]!.number : undefined,
      next:
        index < rows.length - 1 ? rows[index + 1]!.number : undefined,
    };
  },
);

/**
 * Purchased chapters and admin/publisher bypass for one novel.
 * Used when the contents menu opens, not on every chapter view.
 */
export const getChapterAccess = cache(
  async (
    slug: string,
  ): Promise<{ bypass: boolean; unlocked: number[] }> => {
    const novel = await fetchNovelIdBySlug(slug);
    if (!novel) return { bypass: false, unlocked: [] };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { bypass: false, unlocked: [] };

    const isPublisher =
      novel.publisher_id !== null && currentUser.id === novel.publisher_id;
    if (currentUser.isAdmin || isPublisher) {
      return { bypass: true, unlocked: [] };
    }

    const unlocked = await getUnlockedChapterNumbers(slug);
    return { bypass: false, unlocked: [...unlocked] };
  },
);

export const getChapterSummaries = cache(
  async (slug: string): Promise<ChapterSummary[]> => {
    const chapters = await getChapterListItems(slug);
    return chapters.map(({ number, title, locked }) => ({
      number,
      title,
      locked,
    }));
  },
);

export const getChapter = cache(
  async (
    slug: string,
    chapterNumber: number,
  ): Promise<Chapter | undefined> => {
    // Never prerender an entitlement-dependent result, even when a purchased
    // body is already present in the server's shared data cache.
    await connection();
    const novel = await fetchNovelIdBySlug(slug);
    if (!novel) return undefined;

    const row = await fetchDbChapterMeta(novel.id, chapterNumber);
    if (!row) return undefined;

    // Free chapters are the same for every visitor. Skip auth and unlock
    // lookups so a cached body does not touch Auth or Postgres.
    if (isNaturallyFree(row)) {
      const listItem = mapChapterListItem(slug, row, new Set(), false);
      const body = await fetchDbChapterContent(novel.id, chapterNumber);
      return toChapter(
        row,
        listItem,
        splitContent(body?.content ?? ""),
        body?.translatorNote,
      );
    }

    const currentUser = await getCurrentUser();
    const isPublisher =
      novel.publisher_id !== null && currentUser?.id === novel.publisher_id;
    const bypassLock = currentUser?.isAdmin === true || isPublisher;
    const purchased = !bypassLock && currentUser
      ? await hasChapterUnlock(slug, chapterNumber, currentUser.id)
      : false;
    const unlocked = new Set(purchased ? [chapterNumber] : []);
    const listItem = mapChapterListItem(slug, row, unlocked, bypassLock);
    if (listItem.locked) {
      return toChapter(row, listItem);
    }

    const body = await fetchDbChapterContent(novel.id, chapterNumber);
    return toChapter(
      row,
      listItem,
      splitContent(body?.content ?? ""),
      body?.translatorNote,
    );
  },
);

/** Public rendering must never call the entitlement-dependent getChapter. */
export async function getPublicFreeChapter(
  slug: string,
  chapterNumber: number,
): Promise<Chapter | undefined> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 86400, expire: 604800 });
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return undefined;
  cacheTag(
    novelChaptersCacheTag(novel.id),
    chapterBodyCacheTag(novel.id, chapterNumber),
    novelChapterBodiesCacheTag(novel.id),
  );
  const row = await fetchDbChapterMeta(novel.id, chapterNumber);
  // Scheduled releases are deliberately evaluated by getChapter per request.
  if (!row?.is_free) return undefined;
  const body = await fetchDbChapterContent(novel.id, chapterNumber);
  if (body?.content == null) return undefined;
  return toChapter(
    row,
    mapChapterListItem(slug, row, new Set(), false),
    splitContent(body.content),
    body.translatorNote,
  );
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
        ...novel.genres,
        ...novel.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** A small, public-only index, shared by all autocomplete queries. */
export async function getNovelSearchIndex(): Promise<NovelTitleMatch[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(NOVELS_CATALOG_CACHE_TAG);
  return (await getNovels()).map(({ slug, title, coverUrl }) => ({ slug, title, coverUrl }));
}

/** Compatibility for older clients; current search matches in the browser. */
export async function getClosestNovelTitleMatch(query: string): Promise<NovelTitleMatch | null> {
  if (!query.trim() || query.trim().length > 100) return null;
  return findClosestNovelTitle(await getNovelSearchIndex(), query);
}

export const isUserAuthenticated = cache(async (): Promise<boolean> => {
  return Boolean(await getAuthClaims());
});

type DbCommentRow = {
  id: string;
  novel_slug: string;
  chapter_number: number | null;
  parent_id: string | null;
  body: string;
  rating: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

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

// -----------------------------------------------------------------------------
// Ratings from comments (optional stars on top-level comments)
// -----------------------------------------------------------------------------

export async function getNovelRatingSummary(
  slug: string,
): Promise<NovelRatingSummary> {
  const summaries = await getNovelRatingSummariesBySlug([slug]);
  return summaries[slug] ?? { average: 0, count: 0 };
}

/** Batch rating averages for many novels (one grouped query). */
export async function getNovelRatingSummariesBySlug(
  slugs: string[],
): Promise<Record<string, NovelRatingSummary>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return {};

  const all = await unstable_cache(
    async (): Promise<Record<string, NovelRatingSummary>> => {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("novel_rating_summaries");

      if (error) throw new Error("Could not load ratings", { cause: error });

      const summaries: Record<string, NovelRatingSummary> = {};
      for (const row of (data ?? []) as {
        novel_slug: string;
        average: number | string;
        rating_count: number | string;
      }[]) {
        const count = Number(row.rating_count);
        summaries[row.novel_slug] = {
          average: count > 0 ? Number(row.average) : 0,
          count,
        };
      }
      return summaries;
    },
    ["novel-rating-summaries-v2"],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [NOVELS_CATALOG_CACHE_TAG, NOVEL_RATINGS_CACHE_TAG],
    },
  )();

  const result: Record<string, NovelRatingSummary> = {};
  for (const slug of unique) {
    result[slug] = all[slug] ?? { average: 0, count: 0 };
  }
  return result;
}

export async function isChapterReadable(
  slug: string,
  chapterNumber: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) return false;
  const novel = await fetchNovelIdBySlug(slug);
  if (!novel) return false;

  const row = await fetchDbChapterMeta(novel.id, chapterNumber);
  if (!row) return false;
  if (isNaturallyFree(row)) return true;

  const currentUser = await getCurrentUser();
  if (!currentUser) return false;
  const isPublisher =
    novel.publisher_id !== null && currentUser.id === novel.publisher_id;
  if (currentUser.isAdmin || isPublisher) return true;
  return hasChapterUnlock(slug, chapterNumber, currentUser.id);
}
