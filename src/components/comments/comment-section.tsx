import {
  getChapterComments,
  getChapterSummaries,
  getNovelComments,
  getReadableChapters,
  isUserAuthenticated,
} from "@/lib/data";

import { CommentsPanel } from "./comments-panel";

function titlesFromSummaries(
  summaries: { number: number; title: string }[],
): Record<number, string> {
  return Object.fromEntries(
    summaries.map((chapter) => [
      chapter.number,
      chapter.title || `Chapter ${chapter.number}`,
    ]),
  );
}

export async function CommentSection({
  mode,
  novelSlug,
  chapterNumber,
  chapterTitles: chapterTitlesProp,
}: {
  mode: "novel" | "chapter";
  novelSlug: string;
  chapterNumber?: number;
  /** When provided, skips a redundant chapter-summaries fetch. */
  chapterTitles?: Record<number, string>;
}) {
  if (mode === "chapter") {
    if (chapterNumber == null) return null;

    // Chapter comments don't render titles. Skip the full chapter list.
    const [isLoggedIn, comments] = await Promise.all([
      isUserAuthenticated(),
      getChapterComments(novelSlug, chapterNumber),
    ]);

    return (
      <CommentsPanel
        key={`${novelSlug}-${chapterNumber}`}
        mode="chapter"
        novelSlug={novelSlug}
        initialComments={comments}
        initialHasMore={false}
        isLoggedIn={isLoggedIn}
        chapterNumber={chapterNumber}
        chapterTitles={{}}
      />
    );
  }

  const [isLoggedIn, commentsResult, readableChapters, summaries] =
    await Promise.all([
      isUserAuthenticated(),
      getNovelComments(novelSlug),
      getReadableChapters(novelSlug),
      chapterTitlesProp
        ? Promise.resolve(null)
        : getChapterSummaries(novelSlug),
    ]);

  const chapterTitles =
    chapterTitlesProp ?? titlesFromSummaries(summaries ?? []);

  return (
    <CommentsPanel
      key={novelSlug}
      mode="novel"
      novelSlug={novelSlug}
      initialComments={commentsResult.comments}
      initialHasMore={commentsResult.hasMore}
      isLoggedIn={isLoggedIn}
      readableChapters={readableChapters}
      chapterTitles={chapterTitles}
    />
  );
}
