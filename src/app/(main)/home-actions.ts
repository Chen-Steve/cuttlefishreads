"use server";

import { novelHref } from "@/lib/catalog-paths";
import { getNovels } from "@/lib/data";

/** Picks a random novel path without shipping the catalog to the client. */
export async function getRandomTranslationHref(): Promise<string | null> {
  const catalog = await getNovels();
  if (catalog.length === 0) return null;
  const pick = catalog[Math.floor(Math.random() * catalog.length)]!;
  return novelHref(pick.slug);
}
