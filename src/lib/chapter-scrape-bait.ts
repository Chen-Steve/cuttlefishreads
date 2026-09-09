/**
 * Poison HTML dumps of chapter pages with hidden copy from the same chapter.
 * Visible layout, find-in-page, and screen readers skip it (`hidden` +
 * `aria-hidden`).
 */

export type ChapterScrapeBait = {
  rng: () => number;
  phrases: string[];
  decoyParagraphs: string[];
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedRng(): () => number {
  const seed = new Uint32Array(1);
  crypto.getRandomValues(seed);
  return mulberry32(seed[0] ?? 1);
}

function chapterWords(paragraphs: string[]): string[] {
  const words: string[] = [];
  for (const paragraph of paragraphs) {
    for (const word of paragraph.split(/\s+/)) {
      const trimmed = word.trim();
      if (trimmed.length > 1) words.push(trimmed);
    }
  }
  return words;
}

function pickWords(words: string[], rng: () => number, count: number): string[] {
  if (words.length === 0) return [];
  return Array.from({ length: count }, () => {
    const index = Math.floor(rng() * words.length);
    return words[index] ?? words[0]!;
  });
}

export function createChapterScrapeBait(
  paragraphs: string[],
): ChapterScrapeBait {
  const rng = seedRng();
  const words = chapterWords(paragraphs);

  const phrases =
    words.length === 0
      ? []
      : Array.from({ length: Math.min(48, 8 + words.length) }, () => {
          const count = 2 + Math.floor(rng() * 4);
          return ` ${pickWords(words, rng, count).join(" ")} `;
        });

  const decoyParagraphs =
    words.length === 0
      ? []
      : paragraphs.map(() => {
          const count = 8 + Math.floor(rng() * 18);
          return pickWords(words, rng, count).reverse().join(" ");
        });

  return {
    rng,
    phrases,
    decoyParagraphs,
  };
}

export function nextBaitEvery(rng: () => number): number {
  return 2 + Math.floor(rng() * 3);
}
