import {
  getChapterComments,
  getChapterSummaries,
  getNovelComments,
  getReadableChapters,
  isUserAuthenticated,
} from "@/lib/data";

import { CommentsPanel } from "./comments-panel";

export async function CommentSection({
  mode,
  novelSlug,
  chapterNumber,
}: {
  mode: "novel" | "chapter";
  novelSlug: string;
  chapterNumber?: number;
}) {
  const [isLoggedIn, summaries] = await Promise.all([
    isUserAuthenticated(),
    getChapterSummaries(novelSlug),
  ]);

  const chapterTitles = Object.fromEntries(
    summaries.map((chapter) => [chapter.number, chapter.title]),
  );

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
