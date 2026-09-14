import { type NextRequest, NextResponse } from "next/server";
import {
  isBlockedCrawlerUserAgent,
  isCrawlerBlockExemptPath,
} from "@/lib/blocked-crawlers";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    !isCrawlerBlockExemptPath(pathname) &&
    isBlockedCrawlerUserAgent(request.headers.get("user-agent"))
  ) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
