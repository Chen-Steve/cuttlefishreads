import type { CookieOptions } from "@supabase/ssr";

import {
  authCookieDomainForHost,
  authCookieOptionsForHost,
} from "@/lib/auth-cookies";

/** Supabase auth session cookie (including chunked `sb-*-auth-token.N`). */
export function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("auth-token");
}

/** Errors that mean the stored session is dead and must not be retried. */
export function isStaleAuthSessionError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "session_not_found" ||
    message.includes("refresh token not found") ||
    message.includes("invalid refresh token") ||
    message.includes("session not found")
  );
}

type CookieSetter = (
  name: string,
  value: string,
  options?: Partial<CookieOptions>,
) => void;

/**
 * Expire auth cookies both host-only and on the shared Domain.
 * Browsers treat those as distinct cookie jars; clearing only one leaves a
 * stale session that middleware will keep trying to refresh.
 */
export function clearSupabaseAuthCookies(
  cookieNames: Iterable<string>,
  hostHeader: string | null | undefined,
  setCookie: CookieSetter,
): void {
  const domain = authCookieDomainForHost(hostHeader);
  const base = authCookieOptionsForHost(hostHeader);

  for (const name of cookieNames) {
    if (!isSupabaseAuthCookie(name)) continue;

    setCookie(name, "", { path: "/", maxAge: 0 });
    if (domain) {
      setCookie(name, "", {
        ...base,
        domain,
        maxAge: 0,
      });
    }
  }
}
