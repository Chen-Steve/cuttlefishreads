import { NextResponse } from "next/server";
import { getNovelSearchIndex } from "@/lib/data";

export async function GET() {
  const novels = await getNovelSearchIndex();
  return NextResponse.json({ novels }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
