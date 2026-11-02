export const COMMENTS_PAGE_SIZE = 20;
export const REPLIES_PAGE_SIZE = 10;

export type CommentCursor = { createdAt: string; id: string };

export function validateCommentCursor(value: unknown): CommentCursor | null {
  if (value == null) return null;
  if (typeof value !== "object") throw new Error("Invalid comment cursor.");
  const { createdAt, id } = value as Partial<CommentCursor>;
  // Values are interpolated into a PostgREST filter: accept only timestamps
  // and UUIDs, never arbitrary filter expressions supplied by a browser.
  if (typeof createdAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt) ||
    !Number.isFinite(Date.parse(createdAt)) ||
    typeof id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid comment cursor.");
  }
  return { createdAt, id };
}

export function commentCursorFilter(cursor: CommentCursor, ascending: boolean): string {
  const op = ascending ? "gt" : "lt";
  return `created_at.${op}.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.${op}.${cursor.id})`;
}

/** Optimistic inserts and fetched pages can overlap. Never duplicate a row. */
export function mergeCommentPages<T extends { id: string }>(current: T[], page: T[]): T[] {
  const seen = new Set(current.map((row) => row.id));
  return [...current, ...page.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  })];
}
