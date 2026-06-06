import type { MetadataRoute } from "next";
import { getChapterSummaries, getNovels } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const novels = await getNovels();
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
  ];

  const novelRoutes: MetadataRoute.Sitemap = novels.map((novel) => ({
    url: absoluteUrl(`/novels/${novel.slug}`),
    lastModified: new Date(novel.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const chapterRoutes = (
    await Promise.all(
      novels.map(async (novel) => {
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

  return [...staticRoutes, ...novelRoutes, ...chapterRoutes];
}
