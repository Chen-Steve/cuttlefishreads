import type { NovelTitleMatch } from "@/lib/novel-title-search";

const INDEX_TTL_MS = 5 * 60_000;
let cached: { novels: NovelTitleMatch[]; at: number } | null = null;
let inflight: Promise<NovelTitleMatch[]> | null = null;

/** Shared by the desktop/mobile search boxes; never sends the typed query. */
export function loadNovelSearchIndex(): Promise<NovelTitleMatch[]> {
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return Promise.resolve(cached.novels);
  if (inflight) return inflight;
  inflight = fetch("/api/search-index")
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not load search suggestions.");
      const body = await response.json() as { novels: NovelTitleMatch[] };
      if (!Array.isArray(body.novels)) throw new Error("Invalid search index.");
      cached = { novels: body.novels, at: Date.now() };
      return body.novels;
    })
    .finally(() => { inflight = null; });
  return inflight;
}
