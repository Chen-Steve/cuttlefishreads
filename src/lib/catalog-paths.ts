/** Path helpers for the novel catalog (/novels). */

export type CatalogBase = "novels";

export function novelHref(slug: string, _base: CatalogBase = "novels") {
  return `/novels/${slug}`;
}

export function chapterHref(
  slug: string,
  chapter: number | string,
  _base: CatalogBase = "novels",
) {
  return `/novels/${slug}/${chapter}`;
}

export function novelPublicHref(novel: Pick<{ slug: string }, "slug">) {
  return novelHref(novel.slug);
}

export function chapterPublicHref(
  novel: Pick<{ slug: string }, "slug">,
  chapter: number | string,
) {
  return chapterHref(novel.slug, chapter);
}
