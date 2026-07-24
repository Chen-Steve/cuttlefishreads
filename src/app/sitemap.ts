import type { MetadataRoute } from "next";
import { getChapterSummaries, getNovels } from "@/lib/data";
import { originalsPublicUrl } from "@/lib/hosts";
import { isOriginalNovel } from "@/lib/originals-data";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const novels = await getNovels();
  const originals = novels.filter(isOriginalNovel);
  const translations = novels.filter((novel) => !isOriginalNovel(novel));
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/novels"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/search"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: originalsPublicUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: originalsPublicUrl("/browse"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: originalsPublicUrl("/latest"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const novelRoutes: MetadataRoute.Sitemap = translations.map((novel) => ({
    url: absoluteUrl(`/novels/${novel.slug}`),
    lastModified: new Date(novel.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const chapterRoutes = (
    await Promise.all(
      translations.map(async (novel) => {
        const chapters = await getChapterSummaries(novel.slug);

        return chapters
          .filter((chapter) => !chapter.locked)
          .map((chapter) => ({
            url: absoluteUrl(`/novels/${novel.slug}/${chapter.number}`),
            lastModified: new Date(novel.updatedAt),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          }));
      }),
    )
  ).flat();

  const originalRoutes: MetadataRoute.Sitemap = originals.map((novel) => ({
    url: originalsPublicUrl(`/series/${novel.slug}`),
    lastModified: new Date(novel.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const originalChapterRoutes = (
    await Promise.all(
      originals.map(async (novel) => {
        const chapters = await getChapterSummaries(novel.slug);

        return chapters.map((chapter) => ({
          url: originalsPublicUrl(
            `/series/${novel.slug}/chapter/${chapter.number}`,
          ),
          lastModified: new Date(novel.updatedAt),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }));
      }),
    )
  ).flat();

  return [
    ...staticRoutes,
    ...novelRoutes,
    ...chapterRoutes,
    ...originalRoutes,
    ...originalChapterRoutes,
  ];
}
