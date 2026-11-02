import { NextResponse } from "next/server";

import { getCommentSectionData } from "@/lib/comment-section-data";
import { getNovel } from "@/lib/data";

// Own/liked flags and chapter access are private, including for anonymous requests.
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = new URL(request.url).searchParams.get("chapter");
  const chapterNumber = chapter == null ? undefined : Number(chapter);
  if (chapter != null && (!/^[1-9]\d*$/.test(chapter) || !Number.isSafeInteger(chapterNumber))) {
    return NextResponse.json({ error: "Invalid chapter." }, { status: 400, headers });
  }
  try {
    if (!(await getNovel(slug))) return NextResponse.json({ error: "Novel not found." }, { status: 404, headers });
    return NextResponse.json(await getCommentSectionData(slug, chapterNumber), { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "Unlock this chapter to read its comments.") {
      return NextResponse.json({ error: error.message }, { status: 403, headers });
    }
    console.error("load initial comments:", error);
    return NextResponse.json({ error: "Could not load comments. Please try again." }, { status: 500, headers });
  }
}
