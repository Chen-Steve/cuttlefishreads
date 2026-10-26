import { NextResponse } from "next/server";

import { getNovel, getPublicChapterSummaries } from "@/lib/data";

/** Matches the catalog cache TTL so a publish shows up within a few minutes. */
const CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chapters = await getPublicChapterSummaries(slug);
  return NextResponse.json(
    { chapters },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
