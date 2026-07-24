/** Path helpers so Originals can use /series while translations keep /novels. */

import { originalsPublicUrl } from "@/lib/hosts";
import type { Novel } from "@/types";

export type CatalogBase = "novels" | "series";

export function novelHref(slug: string, base: CatalogBase = "novels") {
  return `/${base}/${slug}`;
}

export function chapterHref(
  slug: string,
  chapter: number | string,
  base: CatalogBase = "novels",
) {
  if (base === "series") {
    return `/series/${slug}/chapter/${chapter}`;
  }
  return `/novels/${slug}/${chapter}`;
}

export function novelPublicHref(novel: Pick<Novel, "slug" | "publicationType">) {
  return novel.publicationType === "original"
    ? originalsPublicUrl(`/series/${novel.slug}`)
    : novelHref(novel.slug);
}

export function chapterPublicHref(
  novel: Pick<Novel, "slug" | "publicationType">,
  chapter: number | string,
) {
  return novel.publicationType === "original"
    ? originalsPublicUrl(`/series/${novel.slug}/chapter/${chapter}`)
    : chapterHref(novel.slug, chapter);
}
