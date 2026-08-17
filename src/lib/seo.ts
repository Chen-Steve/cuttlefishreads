import type { Metadata } from "next";
import type { Novel } from "@/types";
import { SITE } from "@/lib/constants";

const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://cuttlefishreads.com");

export const siteUrl = new URL(publicSiteUrl);

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function canonicalPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function truncateDescription(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export function novelDescription(novel: Novel) {
  if (novel.synopsis) return truncateDescription(novel.synopsis);
  return SITE.seoDescription;
}

export function publicPageMetadata({
  title,
  description = SITE.seoDescription,
  path,
  index = true,
}: {
  title: string;
  description?: string;
  path: string;
  index?: boolean;
}): Metadata {
  const canonical = canonicalPath(path);
  const isHome = canonical === "/";

  return {
    title: isHome ? { absolute: SITE.name } : title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index,
      follow: true,
    },
  };
}
