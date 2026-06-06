import { NextRequest, NextResponse } from "next/server";

import { getClosestNovelTitleMatch } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const match = await getClosestNovelTitleMatch(query);

  return NextResponse.json({ match });
}
