import {
  getChapterComments,
  getChapterSummaries,
  getNovelComments,
  isUserAuthenticated,
  type NovelCommentsResult,
  type ReadableChapter,
} from "@/lib/data";

export type CommentSectionData = NovelCommentsResult & {
  isLoggedIn: boolean;
  readableChapters: ReadableChapter[];
  chapterTitles: Record<number, string>;
};

/** Personalized, request-time data. The chapter loader enforces paid access. */
export async function getCommentSectionData(slug: string, chapterNumber?: number): Promise<CommentSectionData> {
  const [page, isLoggedIn] = await Promise.all([
    chapterNumber == null ? getNovelComments(slug) : getChapterComments(slug, chapterNumber),
    isUserAuthenticated(),
  ]);
  // Chapter comments need no contents list; the novel form uses it to select a chapter.
  const summaries = chapterNumber == null ? await getChapterSummaries(slug) : [];
  return {
    ...page,
    isLoggedIn,
    readableChapters: isLoggedIn ? summaries.filter((c) => !c.locked).map(({ number, title }) => ({ number, title })) : [],
    chapterTitles: Object.fromEntries(summaries.map((c) => [c.number, c.title || `Chapter ${c.number}`])),
  };
}
