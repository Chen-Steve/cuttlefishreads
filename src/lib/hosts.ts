/**
 * Hostname helpers for the main site.
 *
 * Local access:
 *   http://localhost:3000
 *
 * Production:
 *   https://cuttlefishreads.com
 *
 * Fallback for previews: ?__host=<sub> or header x-cf-host=<sub>.
 */

export type SiteSurface = "main";

const ROOT_HOSTS = new Set([
  "cuttlefishreads.com",
  "www.cuttlefishreads.com",
  "localhost",
  "127.0.0.1",
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

export function isMainDomain(host: string): boolean {
  const h = normalizeHost(host);
  if (ROOT_HOSTS.has(h)) return true;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}

export function getSiteSurface(_host: string): {
  surface: SiteSurface;
  creatorSubdomain: string | null;
} {
  return { surface: "main", creatorSubdomain: null };
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

/**
 * Main-site origin for redirects.
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
