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

  // Public GET responses must not spend work refreshing a visitor's session.
  // Crawler checks still run; page and Server Action requests keep refreshes.
  if ((request.method === "GET" || request.method === "HEAD") && (
    pathname === "/api/search-index" || pathname === "/api/search-suggestions" ||
    pathname === "/feed.xml" || /^\/novels\/[^/]+\/feed\.xml$/.test(pathname) ||
    /^\/api\/novels\/[^/]+\/chapters$/.test(pathname)
  )) return NextResponse.next();

  return updateSession(request);
}

export const config = {
  // These files never need cookies or crawler handling. Keep page, RSC and
  // Server Action requests covered, including dynamic slugs containing dots.
  matcher: [
    "/((?!_next/static(?:/|$)|_next/image(?:/|$)|fonts(?:/|$)|(?:favicon\\.ico|cuttle\\.png|background[12]\\.jpg|robots\\.txt|sitemap\\.xml|ads\\.txt)$|api/stripe/webhook$).*)",
  ],
};
