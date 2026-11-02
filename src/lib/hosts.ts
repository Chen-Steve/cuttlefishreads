/**
 * Hostname helpers for the main site.
 *
 * Local access:
 *   http://localhost:3000
 *
 * Production:
 *   https://cuttlefishreads.com
 *
 */

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
