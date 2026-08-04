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
  const isLoggedIn = await isUserAuthenticated();
  const chapterTitles =
    chapterTitlesProp ??
    titlesFromSummaries(await getChapterSummaries(novelSlug));

  if (mode === "chapter") {
    if (chapterNumber == null) return null;

    const comments = await getChapterComments(novelSlug, chapterNumber);

    return (
      <CommentsPanel
        key={`${novelSlug}-${chapterNumber}`}
        mode="chapter"
        novelSlug={novelSlug}
        initialComments={comments}
        initialHasMore={false}
        isLoggedIn={isLoggedIn}
        chapterNumber={chapterNumber}
        chapterTitles={chapterTitles}
      />
    );
  }

  const [{ comments, hasMore }, readableChapters] = await Promise.all([
    getNovelComments(novelSlug),
    getReadableChapters(novelSlug),
  ]);

  return (
    <CommentsPanel
      key={novelSlug}
      mode="novel"
      novelSlug={novelSlug}
      initialComments={comments}
      initialHasMore={hasMore}
      isLoggedIn={isLoggedIn}
      readableChapters={readableChapters}
      chapterTitles={chapterTitles}
    />
  );
}
