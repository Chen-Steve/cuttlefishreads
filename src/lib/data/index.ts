import type { Chapter, Novel } from "@/types";
import {
  chapters,
  featuredSlugs,
  librarySlugs,
  novels,
} from "./novels";

export function getNovels(): Novel[] {
  return [...novels].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getNovel(slug: string): Novel | undefined {
  return novels.find((novel) => novel.slug === slug);
}

export function getFeaturedNovels(): Novel[] {
  return featuredSlugs
    .map((slug) => getNovel(slug))
    .filter((novel): novel is Novel => Boolean(novel));
}

export function getLibraryNovels(): Novel[] {
  return librarySlugs
    .map((slug) => getNovel(slug))
    .filter((novel): novel is Novel => Boolean(novel));
}

export function getChapters(slug: string): Chapter[] {
  return chapters
    .filter((chapter) => chapter.novelSlug === slug)
    .sort((a, b) => a.number - b.number);
}

export function getChapter(
  slug: string,
  chapterNumber: number,
): Chapter | undefined {
  return chapters.find(
    (chapter) => chapter.novelSlug === slug && chapter.number === chapterNumber,
  );
}

export function getAdjacentChapters(slug: string, chapterNumber: number) {
  const list = getChapters(slug);
  const index = list.findIndex((chapter) => chapter.number === chapterNumber);
  return {
    previous: index > 0 ? list[index - 1] : undefined,
    next: index >= 0 && index < list.length - 1 ? list[index + 1] : undefined,
  };
}

export function searchNovels(query: string): Novel[] {
  const q = query.trim().toLowerCase();
  if (!q) return getNovels();

  return getNovels().filter((novel) => {
    const haystack = [
      novel.title,
      novel.author,
      novel.synopsis,
      ...novel.genres,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
