import type { CookieOptions } from "@supabase/ssr";

import { isLocalDevHost, normalizeHost } from "@/lib/hosts";

/**
 * Shared Supabase auth cookie options so a session on the main site
 * is visible on creator subdomains (username.cuttlefishreads.com).
 *
 * Prod: Domain=.cuttlefishreads.com
 * Local: host-only cookies (browsers reject Domain=.localhost as a public
 *   suffix), so creator *.localhost pages render logged-out — they are
 *   public vanity pages, which is fine.
 * Preview / unknown hosts: no Domain (host-only cookies)
 */
export function authCookieDomainForHost(
  hostHeader: string | null | undefined,
): string | undefined {
  if (process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN) {
    return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  }

  const host = normalizeHost(hostHeader);

  // Localhost is a public suffix — Domain=.localhost is not shareable.
  if (isLocalDevHost(host)) {
    return undefined;
  }

  if (
    host === "cuttlefishreads.com" ||
    host.endsWith(".cuttlefishreads.com")
  ) {
    return ".cuttlefishreads.com";
  }

  return undefined;
}

export function authCookieOptionsForHost(
  hostHeader: string | null | undefined,
): CookieOptions {
  const domain = authCookieDomainForHost(hostHeader);
  const isLocal = isLocalDevHost(normalizeHost(hostHeader));

  return {
    path: "/",
    sameSite: "lax",
    secure: !isLocal,
    ...(domain ? { domain } : {}),
  };
}

/** Browser-side cookie options from the current hostname. */
export function authCookieOptionsBrowser(): CookieOptions {
  if (typeof window === "undefined") {
    return authCookieOptionsForHost(null);
  }
  return authCookieOptionsForHost(window.location.host);
}

export function mergeAuthCookieOptions(
  options: CookieOptions | undefined,
  hostHeader: string | null | undefined,
): CookieOptions {
  return {
    ...options,
    ...authCookieOptionsForHost(hostHeader),
  };
}
