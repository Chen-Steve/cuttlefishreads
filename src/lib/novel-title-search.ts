/** Only public catalog fields may be included in the browser's search index. */
export type NovelTitleMatch = {
  slug: string;
  title: string;
  coverUrl?: string;
};

function titleMatchScore(title: string, query: string): number {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle === query) return 0;
  if (lowerTitle.startsWith(query)) return 1;
  const wordIndex = lowerTitle.split(/\s+/).findIndex((word) => word.startsWith(query));
  if (wordIndex >= 0) return 10 + wordIndex;
  const containsIndex = lowerTitle.indexOf(query);
  return containsIndex >= 0 ? 100 + containsIndex : Number.POSITIVE_INFINITY;
}

export function findClosestNovelTitle(
  novels: readonly NovelTitleMatch[],
  query: string,
): NovelTitleMatch | null {
  const q = query.trim().toLowerCase();
  if (!q || q.length > 100) return null;
  let best: NovelTitleMatch | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const novel of novels) {
    const score = titleMatchScore(novel.title, q);
    if (Number.isFinite(score) && (
      score < bestScore || (score === bestScore && novel.title.length < best!.title.length)
    )) {
      best = novel;
      bestScore = score;
    }
  }
  return best;
}
