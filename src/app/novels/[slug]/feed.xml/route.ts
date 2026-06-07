import { notFound } from "next/navigation";

import { getNovel } from "@/lib/data";
import { SITE } from "@/lib/constants";
import { buildRssFeed, getFeedItems, rssResponse } from "@/lib/rss";

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel) notFound();

  const items = await getFeedItems(slug, 100);
  const xml = buildRssFeed({
    title: `${novel.title} — Chapter Updates | ${SITE.name}`,
    description: `Latest free and unlocked chapters for ${novel.title} on ${SITE.name}.`,
    feedPath: `/novels/${slug}/feed.xml`,
    items,
  });

  return rssResponse(xml);
}
