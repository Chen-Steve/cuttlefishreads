/**
 * Hostname helpers for the main site and creator subdomains.
 *
 * Local access (Chromium / Firefox / Edge):
 *   http://localhost:3000
 *   http://moonquill.localhost:3000   (creator vanity page)
 *
 * Production:
 *   https://cuttlefishreads.com
 *   https://moonquill.cuttlefishreads.com
 *
 * Originals lives at originals.cuttlefishreads.com. Its clean public paths
 * are rewritten to the existing internal /originals routes by proxy.ts.
 * Creator subdomains serve a vanity landing page at "/".
 *
 * `*.localhost` resolves to 127.0.0.1 — no hosts-file edit needed.
 * Fallback for previews: ?__host=<sub> or header x-cf-host=<sub>.
 */

export type SiteSurface = "main" | "originals" | "creator";

const ROOT_HOSTS = new Set([
  "cuttlefishreads.com",
  "www.cuttlefishreads.com",
  "localhost",
  "127.0.0.1",
]);

const SYSTEM_SUBDOMAINS = new Set([
  "www",
  "originals",
  "translations",
  "admin",
  "api",
  "auth",
  "cdn",
  "assets",
  "static",
]);

export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "localhost";
  return host.split(":")[0]?.trim().toLowerCase() || "localhost";
}

export function isLocalDevHost(host: string): boolean {
  const h = normalizeHost(host);
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".localhost")
  );
}

/** Strip port; honor local override query/header for preview testing. */
export function resolveRequestHost(
  hostHeader: string | null,
  options?: { override?: string | null },
): string {
  const override = options?.override?.trim().toLowerCase();
  if (override === "main") return "localhost";
  if (override && /^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$/.test(override)) {
    return `${override}.localhost`;
  }
  return normalizeHost(hostHeader);
}

export function getSubdomain(host: string): string | null {
  const h = normalizeHost(host);

  if (h.endsWith(".localhost") && h !== "localhost") {
    const sub = h.slice(0, -".localhost".length);
    return sub.includes(".") ? null : sub || null;
  }

  if (h.endsWith(".cuttlefishreads.com")) {
    const sub = h.slice(0, -".cuttlefishreads.com".length);
    if (!sub || sub.includes(".")) return null;
    return sub;
  }

  return null;
}

export function isMainDomain(host: string): boolean {
  const h = normalizeHost(host);
  if (ROOT_HOSTS.has(h)) return true;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}

export function isOriginalsDomain(host: string): boolean {
  return getSubdomain(host) === "originals";
}

export function isSystemSubdomain(subdomain: string | null): boolean {
  if (!subdomain) return false;
  return SYSTEM_SUBDOMAINS.has(subdomain);
}

export function getSiteSurface(host: string): {
  surface: SiteSurface;
  creatorSubdomain: string | null;
} {
  if (isMainDomain(host)) {
    return { surface: "main", creatorSubdomain: null };
  }
  const sub = getSubdomain(host);
  if (sub === "originals") {
    return { surface: "originals", creatorSubdomain: null };
  }
  if (sub && !isSystemSubdomain(sub)) {
    return { surface: "creator", creatorSubdomain: sub };
  }
  return { surface: "main", creatorSubdomain: null };
}

function localPort(port?: string): string {
  return port || "3000";
}

/** Public origin for a creator's subdomain (prod or local). */
export function creatorPublicOrigin(username: string, port?: string): string {
  const sub = username.trim().toLowerCase();
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost") ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes("127.0.0.1")
  ) {
    return `http://${sub}.localhost:${localPort(port)}`;
  }
  return `https://${sub}.cuttlefishreads.com`;
}

export function mainPublicOrigin(): string {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const site = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    if (site.includes("localhost") || site.includes("127.0.0.1")) {
      return "http://localhost:3000";
    }
    return site;
  }
  return "https://cuttlefishreads.com";
}

export function originalsPublicOrigin(): string {
  if (process.env.NODE_ENV === "development") {
    return "http://originals.localhost:3000";
  }
  if (process.env.NEXT_PUBLIC_ORIGINALS_SITE_URL) {
    return process.env.NEXT_PUBLIC_ORIGINALS_SITE_URL.replace(/\/$/, "");
  }
  return "https://originals.cuttlefishreads.com";
}

export function originalsPublicUrl(path = "/"): string {
  return new URL(path, `${originalsPublicOrigin()}/`).toString();
}

/**
 * Main-site origin for redirects from legacy/creator hosts.
 * Uses the incoming Host header so local dev keeps its port.
 */
export function mainOriginFromRequestHost(
  hostHeader: string | null,
  options?: { override?: string | null },
): string {
  const host = resolveRequestHost(hostHeader, options);

  if (isLocalDevHost(host)) {
    const port =
      hostHeader?.includes(":") && !hostHeader.startsWith("[")
        ? hostHeader.split(":").pop()
        : "3000";
    return `http://localhost:${port || "3000"}`;
  }

  return mainPublicOrigin();
}

/** Originals origin for redirects, preserving the local development port. */
export function originalsOriginFromRequestHost(
  hostHeader: string | null,
  options?: { override?: string | null },
): string {
  const host = resolveRequestHost(hostHeader, options);

  if (isLocalDevHost(host)) {
    const port =
      hostHeader?.includes(":") && !hostHeader.startsWith("[")
        ? hostHeader.split(":").pop()
        : "3000";
    return `http://originals.localhost:${port || "3000"}`;
  }

  return originalsPublicOrigin();
}
