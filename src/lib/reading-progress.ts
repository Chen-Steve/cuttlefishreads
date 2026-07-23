export const READING_PROGRESS_STORAGE_KEY = "cf-reading-progress";

/** How many novels to show in Continue reading (most recently read). */
export const CONTINUE_READING_LIMIT = 3;

/** Max progress entries kept in localStorage. */
export const READING_PROGRESS_STORAGE_LIMIT = 30;

export type ReadingProgressEntry = {
  slug: string;
  chapterNumber: number;
  updatedAt: number;
};

export type ReadingProgressMap = Record<string, ReadingProgressEntry>;

function isEntry(value: unknown): value is ReadingProgressEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as ReadingProgressEntry;
  return (
    typeof entry.slug === "string" &&
    entry.slug.length > 0 &&
    typeof entry.chapterNumber === "number" &&
    Number.isFinite(entry.chapterNumber) &&
    entry.chapterNumber >= 1 &&
    typeof entry.updatedAt === "number" &&
    Number.isFinite(entry.updatedAt)
  );
}

export function parseReadingProgress(raw: string | null): ReadingProgressMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: ReadingProgressMap = {};
    for (const [slug, value] of Object.entries(parsed)) {
      if (!isEntry(value)) continue;
      result[slug] = {
        slug,
        chapterNumber: Math.floor(value.chapterNumber),
        updatedAt: value.updatedAt,
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function readReadingProgress(): ReadingProgressMap {
  try {
    return parseReadingProgress(
      localStorage.getItem(READING_PROGRESS_STORAGE_KEY),
    );
  } catch {
    return {};
  }
}

export function listReadingProgress(
  limit = READING_PROGRESS_STORAGE_LIMIT,
): ReadingProgressEntry[] {
  return Object.values(readReadingProgress())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function recordReadingProgress(
  slug: string,
  chapterNumber: number,
): void {
  const normalizedSlug = slug.trim();
  const chapter = Math.floor(chapterNumber);
  if (!normalizedSlug || !Number.isFinite(chapter) || chapter < 1) return;

  try {
    const current = readReadingProgress();
    current[normalizedSlug] = {
      slug: normalizedSlug,
      chapterNumber: chapter,
      updatedAt: Date.now(),
    };

    const trimmed = Object.fromEntries(
      Object.values(current)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, READING_PROGRESS_STORAGE_LIMIT)
        .map((entry) => [entry.slug, entry]),
    );

    localStorage.setItem(
      READING_PROGRESS_STORAGE_KEY,
      JSON.stringify(trimmed),
    );
    window.dispatchEvent(
      new CustomEvent("cf-reading-progress", { detail: trimmed }),
    );
  } catch {
    // private mode / blocked storage
  }
}

export function clearReadingProgress(slug: string): void {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return;

  try {
    const current = readReadingProgress();
    if (!(normalizedSlug in current)) return;
    delete current[normalizedSlug];
    localStorage.setItem(
      READING_PROGRESS_STORAGE_KEY,
      JSON.stringify(current),
    );
    window.dispatchEvent(
      new CustomEvent("cf-reading-progress", { detail: current }),
    );
  } catch {
    // private mode / blocked storage
  }
}
