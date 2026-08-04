"use server";

import { novelHref } from "@/lib/catalog-paths";
import { getNovels } from "@/lib/data";
import { isOriginalNovel } from "@/lib/originals-data";

/** Picks a random translation novel path without shipping the catalog to the client. */
export async function getRandomTranslationHref(): Promise<string | null> {
  const catalog = (await getNovels()).filter((novel) => !isOriginalNovel(novel));
  if (catalog.length === 0) return null;
  const pick = catalog[Math.floor(Math.random() * catalog.length)]!;
  return novelHref(pick.slug);
}
