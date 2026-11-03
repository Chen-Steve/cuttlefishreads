export const CHAPTER_LIST_PAGE_SIZE = 50;

export type ChapterListOrder = "oldest" | "newest";

export function parseChapterListOrder(
  value: string | null,
): ChapterListOrder | null {
  if (value === "oldest" || value === "newest") return value;
  return null;
}

/** Page indexes are zero-based. Reject anything the list UI cannot request. */
export function parseChapterListPage(value: string | null): number | null {
  if (value == null || !/^\d+$/.test(value)) return null;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page > 10_000) return null;
  return page;
}
