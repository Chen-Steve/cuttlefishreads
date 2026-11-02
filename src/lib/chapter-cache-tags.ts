export const NOVEL_DETAILS_CACHE_TAG = "novel-details";

export function novelDetailCacheTag(slug: string): string {
  return `novel-detail:${slug}`;
}

/** Lists and access rules must expire immediately after a workspace mutation. */
export function novelChaptersCacheTag(novelId: string): string {
  return `novel-chapters:${novelId}`;
}

/** Only used when removing a whole novel, never when publishing a chapter. */
export function novelChapterBodiesCacheTag(novelId: string): string {
  return `novel-chapter-bodies:${novelId}`;
}

export function chapterBodyCacheTag(novelId: string, number: number): string {
  return `chapter-body:${novelId}:${number}`;
}
