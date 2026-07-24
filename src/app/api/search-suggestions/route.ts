import { NextRequest, NextResponse } from "next/server";

import type { PublicationType } from "@/lib/constants";
import { PUBLICATION_TYPES } from "@/lib/constants";
import { getClosestNovelTitleMatch } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const rawType = request.nextUrl.searchParams.get("type");
  const publicationType = PUBLICATION_TYPES.includes(
    rawType as PublicationType,
  )
    ? (rawType as PublicationType)
    : undefined;

  const match = await getClosestNovelTitleMatch(query, { publicationType });

  return NextResponse.json({ match });
}
