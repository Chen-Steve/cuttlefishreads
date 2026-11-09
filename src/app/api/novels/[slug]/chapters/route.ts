import { NextResponse } from "next/server";

import { getNovel, getPublicChapterSummaries } from "@/lib/data";

/** Lock flags depend on the clock, so this response is not shared across visitors. */
const CACHE_CONTROL = "private, no-store";

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
