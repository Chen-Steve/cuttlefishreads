/**
 * Word count for stored chapter Markdown. Matches `chapters_set_word_count()`:
 * whitespace-split tokens of the trimmed body, so the editor agrees with the
 * chapter list after save.
 */
export function countChapterWords(content: string): number {
  const trimmed = content.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}
