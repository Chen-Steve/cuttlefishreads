import { NextResponse } from "next/server";

import {
  parseChapterListOrder,
  parseChapterListPage,
} from "@/lib/chapter-list-page";
import { getNovel, getPublicChapterListPage } from "@/lib/data";

/** Lock flags depend on the clock, so this response is not shared across visitors. */
const CACHE_CONTROL = "private, no-store";

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
