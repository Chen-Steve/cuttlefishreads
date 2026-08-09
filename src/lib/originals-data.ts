import { cache } from "react";
import {
  getCompletedNovels,
  getNewlyAddedNovels,
  getNovels,
  getRecentlyUpdatedNovels,
  getUserCreatedNovels,
} from "@/lib/data";
import type { Novel } from "@/types";
import { createAdminClient } from "@/utils/supabase/admin";

const TRENDING_LIMIT = 7;

export function isOriginalNovel(novel: Novel): boolean {
  return novel.publicationType === "original";
}

export async function getOriginalsCatalog(): Promise<Novel[]> {
  const novels = await getNovels();
  return novels.filter(isOriginalNovel);
}

/** Whether the user publishes at least one original series (layout badge). */
export const userHasOriginalSeries = cache(async function (
  userId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("novels")
    .select("id", { count: "exact", head: true })
    .eq("publisher_id", userId)
    .eq("publication_type", "original");

  if (error) {
    console.error("userHasOriginalSeries:", error);
    return false;
  }
  return (count ?? 0) > 0;
});

/** Public original-series records owned by a user. */
export const getUserOriginalSeries = cache(async function (
  userId: string,
): Promise<Novel[]> {
  return (await getUserCreatedNovels(userId)).filter(isOriginalNovel);
});

function getTrendingOriginals(catalog: Novel[]): Novel[] {
  if (catalog.length === 0) return [];
  return [...catalog]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, TRENDING_LIMIT);
}

export async function getOriginalsHomeData() {
  const catalog = await getOriginalsCatalog();
  const slugs = new Set(catalog.map((n) => n.slug));

  const [newlyAdded, recentlyUpdated, completed] = await Promise.all([
    getNewlyAddedNovels(catalog),
    getRecentlyUpdatedNovels().then((rows) =>
      rows.filter((n) => slugs.has(n.slug)),
    ),
    getCompletedNovels(catalog),
  ]);

  return {
    catalog,
    featured: getTrendingOriginals(catalog),
    newlyAdded,
    recentlyUpdated,
    completed,
  };
}
