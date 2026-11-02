import {
  buildRssFeed,
  getFeedItems,
  globalFeedMetadata,
  rssResponse,
} from "@/lib/rss";

export async function GET() {
  const meta = globalFeedMetadata();
  const items = await getFeedItems();
  const xml = buildRssFeed({ ...meta, items });
  return rssResponse(xml);
}
