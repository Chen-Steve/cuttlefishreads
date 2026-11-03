import { NextResponse } from "next/server";

import {
  parseChapterListOrder,
  parseChapterListPage,
} from "@/lib/chapter-list-page";
import { getChapterListLockUpdates, getNovel } from "@/lib/data";

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

  const [novel, updates] = await Promise.all([
    getNovel(slug),
    getChapterListLockUpdates(slug, page, order),
  ]);
  if (!novel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { updates },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
