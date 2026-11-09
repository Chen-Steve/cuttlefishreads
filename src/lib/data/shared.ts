import { cache } from "react";
import { revalidateTag } from "next/cache";

import type { Genre, Language } from "@/lib/constants";
import type { ProfileRole } from "@/lib/roles";
import type { Chapter, ChapterListItem, Novel } from "@/types";
import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";
import { getSessionProfile } from "@/lib/session-profile";
import { NOVEL_DETAILS_CACHE_TAG } from "@/lib/chapter-cache-tags";
import type { Tables } from "@/lib/database.types";

type NovelTable = Tables<"novels">;
export type DbNovel = Pick<
  NovelTable,
  | "id"
  | "slug"
  | "title"
  | "original_author"
  | "translator"
  | "cover_url"
  | "genres"
  | "tags"
  | "status"
  | "updated_at"
  | "publisher_id"
  | "novelupdates_url"
  | "language"
  | "created_at"
> & {
  description?: NovelTable["description"];
  view_count?: NovelTable["view_count"] | null;
  library_add_count?: NovelTable["library_add_count"] | null;
  chapters: { count: number }[];
};

/** Catalog cards / carousels — no synopsis. */
export const NOVEL_LIST_COLUMNS =
  "id, slug, title, original_author, translator, cover_url, genres, tags, status, created_at, updated_at, publisher_id, novelupdates_url, language, view_count, library_add_count, chapters(count)";

/** Novel detail, featured, metadata — includes synopsis. */
export const NOVEL_DETAIL_COLUMNS = `${NOVEL_LIST_COLUMNS}, description`;

// Notes stay off this shared list. A chapter page only needs the open
// chapter's note, which is loaded with that chapter's body.
export const CHAPTER_META_COLUMNS =
  "id, number, title, use_global_translator_note, is_free, coin_cost, unlock_at, published_at";

export const NEWLY_ADDED_LIMIT = 7;
export const UNDERRATED_LIMIT = 7;
export const COMPLETED_LIMIT = 7;
export const FEATURED_LIMIT = 7;

export type DbChapterMeta = Pick<
  Tables<"chapters">,
  | "id"
  | "number"
  | "title"
  | "use_global_translator_note"
  | "is_free"
  | "coin_cost"
  | "unlock_at"
  | "published_at"
>;

export type DbChapterBody = {
  content: string | null;
  translatorNote: string | null;
};

export function splitContent(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/\s+$/, ""))
    .filter((paragraph) => paragraph.trim().length > 0);
}

export function formatDate(value: string): string {
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

export function mapNovel(row: DbNovel): Novel {
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

export function mapChapterListItem(
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

export function toChapter(
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

/** Request-scoped view of the signed-in profile. Does not load the profile again. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
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
export const getUnlockedChapterNumbers = cache(
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
export const hasChapterUnlock = cache(
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

export const CATALOG_REVALIDATE_SECONDS = 60 * 5;
// Chapters only change through workspace actions, which bust by tag.
export const CHAPTER_REVALIDATE_SECONDS = 60 * 60 * 24;
export const COMMENTS_REVALIDATE_SECONDS = 60 * 15;

/**
 * Refresh public catalog caches. Chapter access and bodies are expired
 * separately by workspace actions, without stale-while-revalidate.
 */
export function revalidateNovelsDataCache(includeDetails = false) {
  revalidateTag(NOVELS_CATALOG_CACHE_TAG, "max");
  revalidateTag(RECENTLY_UPDATED_NOVELS_CACHE_TAG, "max");
  if (includeDetails) revalidateTag(NOVEL_DETAILS_CACHE_TAG, "max");
}
