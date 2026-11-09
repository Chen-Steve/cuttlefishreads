import { cache } from "react";
import { unstable_cache, cacheLife, cacheTag } from "next/cache";

import { hasProfileRole, parseProfileRoles, type ProfileRole } from "@/lib/roles";
import { findClosestNovelTitle, type NovelTitleMatch } from "@/lib/novel-title-search";
import { NOVEL_DETAILS_CACHE_TAG, novelDetailCacheTag } from "@/lib/chapter-cache-tags";
import type { Novel, NovelRatingSummary, RecentlyUpdatedNovel } from "@/types";
import { getAuthClaims } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { formatRelativeDate } from "@/lib/utils";
import {
  CATALOG_REVALIDATE_SECONDS,
  COMPLETED_LIMIT,
  DbNovel,
  FEATURED_LIMIT,
  NEWLY_ADDED_LIMIT,
  NOVEL_DETAIL_COLUMNS,
  NOVEL_LIST_COLUMNS,
  NOVEL_RATINGS_CACHE_TAG,
  NOVELS_CATALOG_CACHE_TAG,
  RECENTLY_UPDATED_NOVELS_CACHE_TAG,
  UNDERRATED_LIMIT,
  mapNovel,
  profileCacheTag,
  userBookmarksCacheTag,
} from "./shared";

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
export const fetchNovelIdBySlug = cache(async (slug: string) => {
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
