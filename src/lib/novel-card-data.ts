import type { Novel, NovelCardData } from "@/types";

export function toNovelCardData(novel: Novel): NovelCardData {
  return {
    id: novel.id,
    slug: novel.slug,
    title: novel.title,
    author: novel.author,
    originalAuthor: novel.originalAuthor,
    translator: novel.translator,
    translatorUsername: novel.translatorUsername,
    coverUrl: novel.coverUrl,
    genres: novel.genres,
    tags: novel.tags,
    status: novel.status,
    chapterCount: novel.chapterCount,
    createdAt: novel.createdAt,
    updatedAt: novel.updatedAt,
  };
}
