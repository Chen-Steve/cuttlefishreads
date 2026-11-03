import { NextResponse } from "next/server";

import {
  parseChapterListOrder,
  parseChapterListPage,
} from "@/lib/chapter-list-page";
import { getNovel, getPublicChapterListPage } from "@/lib/data";

/** Matches the catalog cache TTL so a publish shows up within a few minutes. */
const CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const page = parseChapterListPage(url.searchParams.get("page"));
  const order = parseChapterListOrder(url.searchParams.get("order"));
  if (page == null || order == null) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  const [novel, list] = await Promise.all([
    getNovel(slug),
    getPublicChapterListPage(slug, page, order),
  ]);
  if (!novel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { chapters: list.chapters, totalCount: list.totalCount },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
