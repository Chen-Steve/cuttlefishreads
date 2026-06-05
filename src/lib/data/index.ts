import { cookies } from "next/headers";

import type { Genre } from "@/lib/constants";
import type { Chapter, Novel } from "@/types";
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
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
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
    .order("number", { ascending: true });

  if (error) {
    console.error("fetchDbChapters:", error);
    return [];
  }
  return (data ?? []) as DbChapter[];
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
