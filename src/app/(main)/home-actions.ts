"use server";

import { novelHref } from "@/lib/catalog-paths";
import { getNovels } from "@/lib/data";

/** Picks a random novel path without shipping the catalog to the client. */
export async function getRandomTranslationHref(): Promise<string | null> {
  const catalog = await getNovels();
  const pick = catalog[Math.floor(Math.random() * catalog.length)];
  return pick ? novelHref(pick.slug) : null;
}
