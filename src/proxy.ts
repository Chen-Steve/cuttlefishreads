import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import {
  getSiteSurface,
  isMainDomain,
  isOriginalsDomain,
  mainOriginFromRequestHost,
  originalsOriginFromRequestHost,
  resolveRequestHost,
} from "@/lib/hosts";

function cleanOriginalsPath(pathname: string): string {
  if (pathname === "/originals") return "/";
  return pathname.slice("/originals".length) || "/";
}

function isOriginalsInternalPath(pathname: string): boolean {
  return pathname === "/originals" || pathname.startsWith("/originals/");
}

function isCleanOriginalsPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/browse" ||
    pathname.startsWith("/browse/") ||
    pathname === "/latest" ||
    pathname.startsWith("/latest/") ||
    pathname === "/apply" ||
    pathname.startsWith("/apply/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/workspace" ||
    pathname.startsWith("/workspace/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostHeader = request.headers.get("host");
  const override =
    request.nextUrl.searchParams.get("__host") ??
    request.headers.get("x-cf-host");
  const host = resolveRequestHost(hostHeader, { override });

  const skipHostRouting =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/");

  // Originals uses clean public URLs while retaining /originals as the
  // internal App Router namespace.
  if (!skipHostRouting && isOriginalsDomain(host)) {
    if (isOriginalsInternalPath(pathname)) {
      const dest = new URL(
        originalsOriginFromRequestHost(hostHeader, { override }),
      );
      dest.pathname = cleanOriginalsPath(pathname);
      dest.search = request.nextUrl.search;
      return NextResponse.redirect(dest, 308);
    }

    if (isCleanOriginalsPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname =
        pathname === "/" ? "/originals" : `/originals${pathname}`;
      return updateSession(request, NextResponse.rewrite(url));
    }

    // Series and auth routes are shared by the same deployment and can stay
    // on the Originals host. Main-site-only routes remain canonical there.
    if (
      !pathname.startsWith("/series/") &&
      !pathname.startsWith("/creator/") &&
      !pathname.startsWith("/profiles/") &&
      pathname !== "/login" &&
      pathname !== "/signup" &&
      pathname !== "/forgot-password" &&
      pathname !== "/reset-password" &&
      pathname !== "/robots.txt" &&
      pathname !== "/sitemap.xml"
    ) {
      const dest = new URL(mainOriginFromRequestHost(hostHeader, { override }));
      dest.pathname = pathname;
      dest.search = request.nextUrl.search;
      return NextResponse.redirect(dest, 308);
    }
  }

  // Preserve old main-domain links while making the subdomain canonical.
  if (
    !skipHostRouting &&
    isMainDomain(host) &&
    (isOriginalsInternalPath(pathname) ||
      pathname.startsWith("/series/") ||
      pathname.startsWith("/creator/") ||
      pathname.startsWith("/profiles/"))
  ) {
    const dest = new URL(
      originalsOriginFromRequestHost(hostHeader, { override }),
    );
    dest.pathname = isOriginalsInternalPath(pathname)
      ? cleanOriginalsPath(pathname)
      : pathname;
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, 308);
  }

  const { surface, creatorSubdomain } = getSiteSurface(host);

  // Creator subdomains are vanity landing pages only. The root shows the
  // creator profile; every other path redirects to the canonical main-domain
  // URL so content is never duplicated across hosts.
  if (!skipHostRouting && surface === "creator" && creatorSubdomain) {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = `/creator/${creatorSubdomain}`;
      return updateSession(request, NextResponse.rewrite(url));
    }

    const dest = new URL(
      pathname.startsWith("/series/")
        ? originalsOriginFromRequestHost(hostHeader, { override })
        : mainOriginFromRequestHost(hostHeader, { override }),
    );
    dest.pathname = pathname;
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
