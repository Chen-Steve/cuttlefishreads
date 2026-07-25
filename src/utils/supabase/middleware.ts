import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  authCookieDomainForHost,
  authCookieOptionsForHost,
  mergeAuthCookieOptions,
} from "@/lib/auth-cookies";
import {
  clearSupabaseAuthCookies,
  isStaleAuthSessionError,
  isSupabaseAuthCookie,
} from "@/lib/auth-session";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Refresh the auth session and attach cookies to `response` (or a new next()).
 * Pass an existing rewrite/redirect response so cookie Domain options are kept.
 *
 * On stale refresh tokens, clear auth cookies and treat the request as logged
 * out — do not keep retrying (that triggers Auth rate limits).
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

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookieOptions: authCookieOptionsForHost(host),
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
        cookiesToSet.forEach(({ name, value, options }) => {
          const merged = mergeAuthCookieOptions(options, host);
          // Host-only cookies shadow Domain cookies. Expire the host-only
          // copy only when we are actually writing auth cookies.
          if (sharedDomain && isSupabaseAuthCookie(name)) {
            supabaseResponse.cookies.set(name, "", {
              path: "/",
              maxAge: 0,
            });
          }
          supabaseResponse.cookies.set(name, value, merged);
        });
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // IMPORTANT: Do not run code between createServerClient and getClaims().
  const { error } = await supabase.auth.getClaims();

  if (isStaleAuthSessionError(error)) {
    const names = request.cookies.getAll().map((cookie) => cookie.name);
    clearSupabaseAuthCookies(names, host, (name, value, options) => {
      request.cookies.set(name, value);
      supabaseResponse.cookies.set(name, value, options);
    });
    if (!response) {
      supabaseResponse = NextResponse.next({ request });
      clearSupabaseAuthCookies(names, host, (name, value, options) => {
        supabaseResponse.cookies.set(name, value, options);
      });
    }
  }

  return supabaseResponse;
};
