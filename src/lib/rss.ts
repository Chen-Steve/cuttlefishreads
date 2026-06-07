import { SITE } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";
import { createAdminClient } from "@/utils/supabase/admin";

export const FEED_ITEM_LIMIT = 50;

export type FeedItem = {
  novelSlug: string;
  novelTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  pubDate: Date;
};

type FeedNovelRef = {
  slug: string;
  title: string;
};

type FeedChapterRow = {
  number: number;
  title: string;
  is_free: boolean;
  unlock_at: string | null;
  published_at: string;
  novels: FeedNovelRef;
};

type FeedChapterQueryRow = Omit<FeedChapterRow, "novels"> & {
  novels: FeedNovelRef | FeedNovelRef[] | null;
};

function resolveNovelRef(
  novels: FeedNovelRef | FeedNovelRef[] | null,
): FeedNovelRef | null {
  if (!novels) return null;
  return Array.isArray(novels) ? (novels[0] ?? null) : novels;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getChapterAvailableAt(row: FeedChapterRow): Date | null {
  if (row.is_free) return new Date(row.published_at);
  if (row.unlock_at) {
    const unlockAt = new Date(row.unlock_at);
    if (unlockAt <= new Date()) return unlockAt;
  }
  return null;
}

function mapFeedItem(row: FeedChapterRow): FeedItem | null {
  const availableAt = getChapterAvailableAt(row);
  if (!availableAt) return null;

  const chapterTitle = row.title.trim() || `Chapter ${row.number}`;

  return {
    novelSlug: row.novels.slug,
    novelTitle: row.novels.title,
    chapterNumber: row.number,
    chapterTitle,
    pubDate: availableAt,
  };
}

export async function getFeedItems(
  novelSlug?: string,
  limit = FEED_ITEM_LIMIT,
): Promise<FeedItem[]> {
  const admin = createAdminClient();
  let query = admin
    .from("chapters")
    .select(
      "number, title, is_free, unlock_at, published_at, novels!inner(slug, title)",
    )
    .eq("is_published", true);

  if (novelSlug) {
    query = query.eq("novels.slug", novelSlug);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getFeedItems:", error);
    return [];
  }

  return ((data ?? []) as FeedChapterQueryRow[])
    .map((row) => {
      const novel = resolveNovelRef(row.novels);
      if (!novel) return null;
      return mapFeedItem({ ...row, novels: novel });
    })
    .filter((item): item is FeedItem => item !== null)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, limit);
}

function feedItemTitle(item: FeedItem): string {
  const chapterLabel = item.chapterTitle.startsWith("Chapter ")
    ? item.chapterTitle
    : `Chapter ${item.chapterNumber}: ${item.chapterTitle}`;
  return `${item.novelTitle} — ${chapterLabel}`;
}

export function buildRssFeed({
  title,
  description,
  feedPath,
  items,
}: {
  title: string;
  description: string;
  feedPath: string;
  items: FeedItem[];
}): string {
  const feedUrl = absoluteUrl(feedPath);
  const lastBuildDate = items[0]?.pubDate ?? new Date();

  const channelItems = items
    .map((item) => {
      const chapterPath = `/novels/${item.novelSlug}/${item.chapterNumber}`;
      const chapterUrl = absoluteUrl(chapterPath);

      return `    <item>
      <title>${escapeXml(feedItemTitle(item))}</title>
      <link>${escapeXml(chapterUrl)}</link>
      <guid isPermaLink="true">${escapeXml(chapterUrl)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(absoluteUrl("/"))}</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${channelItems}
  </channel>
</rss>
`;
}

export function rssResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

export function globalFeedMetadata() {
  return {
    title: `${SITE.name} — Chapter Updates`,
    description: `Latest free and unlocked chapter releases on ${SITE.name}.`,
    feedPath: "/feed.xml",
  };
}
