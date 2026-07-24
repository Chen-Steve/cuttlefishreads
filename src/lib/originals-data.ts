import { cache } from "react";
import {
  getCompletedNovels,
  getInHouseViewsBySlug,
  getNewlyAddedNovels,
  getNovels,
  getRecentlyUpdatedNovels,
  getUserCreatedNovels,
} from "@/lib/data";
import type { Novel } from "@/types";

const TRENDING_LIMIT = 7;

export function isOriginalNovel(novel: Novel): boolean {
  return novel.publicationType === "original";
}

export async function getOriginalsCatalog(): Promise<Novel[]> {
  const novels = await getNovels();
  return novels.filter(isOriginalNovel);
}

/** Public original-series records owned by a user. */
export const getUserOriginalSeries = cache(async function (
  userId: string,
): Promise<Novel[]> {
  return (await getUserCreatedNovels(userId)).filter(isOriginalNovel);
});

async function getTrendingOriginals(catalog: Novel[]): Promise<Novel[]> {
  if (catalog.length === 0) return [];
  const viewsBySlug = await getInHouseViewsBySlug(catalog.map((n) => n.slug));
  return [...catalog]
    .sort((a, b) => (viewsBySlug[b.slug] ?? 0) - (viewsBySlug[a.slug] ?? 0))
    .slice(0, TRENDING_LIMIT);
}

export async function getOriginalsHomeData() {
  const catalog = await getOriginalsCatalog();
  const slugs = new Set(catalog.map((n) => n.slug));

  const [featured, newlyAdded, recentlyUpdated, completed] = await Promise.all([
    getTrendingOriginals(catalog),
    getNewlyAddedNovels(catalog),
    getRecentlyUpdatedNovels().then((rows) =>
      rows.filter((n) => slugs.has(n.slug)),
    ),
    getCompletedNovels(catalog),
  ]);

  return { catalog, featured, newlyAdded, recentlyUpdated, completed };
}
