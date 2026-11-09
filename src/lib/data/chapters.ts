import { cache } from "react";
import { unstable_cache, cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

import {
  chapterBodyCacheTag,
  novelChapterBodiesCacheTag,
  novelChaptersCacheTag,
} from "@/lib/chapter-cache-tags";
import type {
  Chapter,
  ChapterListItem,
  ChapterListRow,
  ChapterLockUpdate,
  ChapterSummary,
} from "@/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { CHAPTER_LIST_PAGE_SIZE, type ChapterListOrder } from "@/lib/chapter-list-page";
import { fetchNovelIdBySlug } from "./catalog";
import {
  CHAPTER_META_COLUMNS,
  CHAPTER_REVALIDATE_SECONDS,
  type DbChapterBody,
  type DbChapterMeta,
  formatDate,
  getCurrentUser,
  getUnlockedChapterNumbers,
  hasChapterUnlock,
  isNaturallyFree,
  mapChapterListItem,
  splitContent,
  toChapter,
} from "./shared";

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

function mapChapterBody(data: {
  content?: string | null;
  translator_note?: string | null;
}): DbChapterBody {
  const note = data.translator_note?.trim();
  return {
    content: data.content ?? null,
    translatorNote: note ? note : null,
  };
}

/** Shared cache is only for chapters published as free. Paid and timed text stay out. */
async function fetchCachedFreeChapterBody(
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
        .eq("is_free", true)
        .maybeSingle();

      if (error) {
        throw new Error("Could not load chapter content", { cause: error });
      }
      if (!data) return null;
      return mapChapterBody(data);
    },
    ["chapter-free-body-v1", novelId, String(chapterNumber)],
    {
      revalidate: CHAPTER_REVALIDATE_SECONDS,
      tags: [
        chapterBodyCacheTag(novelId, chapterNumber),
        novelChapterBodiesCacheTag(novelId),
      ],
    },
  )();
}

/** Request-time read. Used after a lock check for paid and timed-release chapters. */
async function fetchChapterBody(
  novelId: string,
  chapterNumber: number,
): Promise<DbChapterBody | null> {
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
  return mapChapterBody(data);
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
 * Stored list page. `locked` follows the is_free column only — a timer is not
 * a cache input. Callers apply `openElapsedUnlocks` at request time.
 */
async function readCachedPublicChapterListPage(
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
  return {
    chapters: sliceChapterMetas(rows, page, order).map((row) =>
      toChapterListRow({
        id: row.id,
        novelSlug: slug,
        number: row.number,
        title: row.title,
        publishedAt: formatDate(row.published_at),
        isFree: row.is_free,
        isAdvanced: !row.is_free,
        coinCost: row.coin_cost,
        unlockAt: row.unlock_at,
        locked: !row.is_free,
        adminAccess: false,
      }),
    ),
    totalCount: rows.length,
  };
}

/** A scheduled release that has already opened is free for every visitor. */
function openElapsedUnlocks(chapters: ChapterListRow[]): ChapterListRow[] {
  const now = Date.now();
  return chapters.map((chapter) => {
    if (!chapter.locked || !chapter.unlockAt) return chapter;
    if (new Date(chapter.unlockAt).getTime() > now) return chapter;
    return { ...chapter, locked: false, isFree: true, adminAccess: false };
  });
}

/**
 * One page of the public chapter list. No auth or unlock lookup.
 * The novel page renders the first oldest page; other pages load on demand.
 * Titles stay cached. Whether a timer has opened is decided on this request.
 */
export async function getPublicChapterListPage(
  slug: string,
  page: number,
  order: ChapterListOrder,
): Promise<PublicChapterListPage> {
  const cached = await readCachedPublicChapterListPage(slug, page, order);
  await connection();
  return {
    totalCount: cached.totalCount,
    chapters: openElapsedUnlocks(cached.chapters),
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
    await connection();
    const novel = await fetchNovelIdBySlug(slug);
    if (!novel) return [];

    const rows = await fetchDbChapterMetas(novel.id);
    return rows.map((row) => ({
      number: row.number,
      title: row.title,
      locked: !isNaturallyFree(row),
      unlockAt: row.unlock_at,
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
    return chapters.map(({ number, title, locked, unlockAt }) => ({
      number,
      title,
      locked,
      unlockAt,
    }));
  },
);

export const getChapter = cache(
  async (
    slug: string,
    chapterNumber: number,
  ): Promise<Chapter | undefined> => {
    // Lock state and paid text are decided on this request.
    await connection();
    const novel = await fetchNovelIdBySlug(slug);
    if (!novel) return undefined;

    const row = await fetchDbChapterMeta(novel.id, chapterNumber);
    if (!row) return undefined;

    // Explicitly free chapters are the same for every visitor.
    if (row.is_free) {
      const listItem = mapChapterListItem(slug, row, new Set(), false);
      const body = await fetchCachedFreeChapterBody(novel.id, chapterNumber);
      return toChapter(
        row,
        listItem,
        splitContent(body?.content ?? ""),
        body?.translatorNote,
      );
    }

    const naturallyFree = isNaturallyFree(row);
    const currentUser = naturallyFree ? null : await getCurrentUser();
    const isPublisher =
      novel.publisher_id !== null && currentUser?.id === novel.publisher_id;
    const bypassLock = currentUser?.isAdmin === true || isPublisher;
    const purchased = !naturallyFree && !bypassLock && currentUser
      ? await hasChapterUnlock(slug, chapterNumber, currentUser.id)
      : false;
    const unlocked = new Set(purchased ? [chapterNumber] : []);
    const listItem = mapChapterListItem(slug, row, unlocked, bypassLock);
    if (listItem.locked) {
      return toChapter(row, listItem);
    }

    const body = await fetchChapterBody(novel.id, chapterNumber);
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
  const body = await fetchCachedFreeChapterBody(novel.id, chapterNumber);
  if (body?.content == null) return undefined;
  return toChapter(
    row,
    mapChapterListItem(slug, row, new Set(), false),
    splitContent(body.content),
    body.translatorNote,
  );
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
