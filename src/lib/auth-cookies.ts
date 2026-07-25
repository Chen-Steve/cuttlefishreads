import type { CookieOptions } from "@supabase/ssr";

import { isLocalDevHost, normalizeHost } from "@/lib/hosts";

function siteUrlHost(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return null;
  try {
    return new URL(site).host;
  } catch {
    return null;
  }
}

function resolveAuthHost(
  hostHeader: string | null | undefined,
): string | null {
  return hostHeader || siteUrlHost();
}

/**
 * Shared Supabase auth cookie options so a session on the main site
 * is visible on creator subdomains (username.cuttlefishreads.com).
 *
 * Prod: Domain=.cuttlefishreads.com
 * Local: host-only cookies (browsers reject Domain=.localhost as a public
 *   suffix). Creator vanity *.localhost visits are redirected to the
 *   originals host so the session still applies.
 * Preview / unknown hosts: no Domain (host-only cookies)
 */
export function authCookieDomainForHost(
  hostHeader: string | null | undefined,
): string | undefined {
  if (process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN) {
    return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  }

  // Prefer the live request host; fall back to SITE_URL so server actions
  // still get Domain=.cuttlefishreads.com when Host is unavailable.
  const rawHost = resolveAuthHost(hostHeader);
  if (!rawHost) return undefined;

  const host = normalizeHost(rawHost);

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
  const rawHost = resolveAuthHost(hostHeader);
  const isLocal = rawHost
    ? isLocalDevHost(normalizeHost(rawHost))
    : process.env.NODE_ENV === "development";

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
