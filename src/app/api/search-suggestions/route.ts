import { NextRequest, NextResponse } from "next/server";

import { getClosestNovelTitleMatch } from "@/lib/data";

/** Matches the catalog cache TTL (5 min) so CDN hits stay consistent with it. */
const CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const match = await getClosestNovelTitleMatch(query);
  return NextResponse.json(
    { match },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
