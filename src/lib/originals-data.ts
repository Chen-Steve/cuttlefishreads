import { cache } from "react";
import {
  getCompletedNovels,
  getFeaturedNovels,
  getNewlyAddedNovels,
  getNovels,
  getRecentlyUpdatedNovels,
  getUserCreatedNovels,
} from "@/lib/data";
import type { Novel } from "@/types";

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

export async function getOriginalsHomeData() {
  const catalog = await getOriginalsCatalog();
  const slugs = new Set(catalog.map((n) => n.slug));

  const [featured, newlyAdded, recentlyUpdated, completed] = await Promise.all([
    getFeaturedNovels(catalog),
    getNewlyAddedNovels(catalog),
    getRecentlyUpdatedNovels().then((rows) =>
      rows.filter((n) => slugs.has(n.slug)),
    ),
    getCompletedNovels(catalog),
  ]);

  return { catalog, featured, newlyAdded, recentlyUpdated, completed };
}

