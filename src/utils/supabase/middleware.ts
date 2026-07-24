import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  authCookieDomainForHost,
  mergeAuthCookieOptions,
} from "@/lib/auth-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Default maxAge used by @supabase/ssr (~400 days). */
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("auth-token");
}

/**
 * Refresh the auth session and attach cookies to `response` (or a new next()).
 * Pass an existing rewrite/redirect response so cookie Domain options are kept.
 *
 * Also upgrades host-only sb-* auth cookies to the shared Domain so a main-site
 * session becomes visible on originals.* without requiring a fresh login.
 */
export const updateSession = async (
  request: NextRequest,
  response?: NextResponse,
) => {
  let supabaseResponse =
    response ??
    NextResponse.next({
      request,
    });

  const host = request.headers.get("host");
  const sharedDomain = authCookieDomainForHost(host);
  const sharedCookieOptions = mergeAuthCookieOptions(
    {
      httpOnly: false,
      maxAge: AUTH_COOKIE_MAX_AGE,
    },
    host,
  );

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookieOptions: sharedCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        if (!response) {
          supabaseResponse = NextResponse.next({
            request,
          });
        }
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(
            name,
            value,
            mergeAuthCookieOptions(options, host),
          ),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // IMPORTANT: Do not run code between createServerClient and getClaims().
  await supabase.auth.getClaims();

  if (sharedDomain) {
    for (const cookie of request.cookies.getAll()) {
      if (!isSupabaseAuthCookie(cookie.name) || !cookie.value) continue;

      // Expire the host-only copy (no Domain) so it cannot shadow the shared one.
      supabaseResponse.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
      });
      supabaseResponse.cookies.set(
        cookie.name,
        cookie.value,
        sharedCookieOptions,
      );
    }
  }

  return supabaseResponse;
};
