import { NextResponse } from "next/server";

import { getChapterAccess, getNovel } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await getChapterAccess(slug);
  return NextResponse.json(access, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
