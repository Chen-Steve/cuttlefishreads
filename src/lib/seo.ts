import type { Metadata } from "next";
import type { Novel } from "@/types";
import { ORIGINALS, SITE } from "@/lib/constants";
import { originalsPublicUrl } from "@/lib/hosts";

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

  const genres = novel.genres.length ? ` ${novel.genres.join(", ")}.` : "";
  return truncateDescription(
    `Read ${novel.title} on ${SITE.name}. Browse chapters, updates, and novel details.${genres}`,
  );
}

export function publicPageMetadata({
  title,
  description = SITE.seoDescription,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  const canonical = canonicalPath(path);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
  };
}

export function originalsPageMetadata({
  title,
  description = ORIGINALS.seoDescription,
  path,
  image,
  openGraphType = "website",
}: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  openGraphType?: "website" | "article" | "book";
}): Metadata {
  const canonical = originalsPublicUrl(canonicalPath(path));
  const brandedTitle =
    title === ORIGINALS.name ? title : `${title} | ${ORIGINALS.name}`;
  const socialImage = image
    ? new URL(image, originalsPublicUrl("/")).toString()
    : originalsPublicUrl("/cuttle.png");

  return {
    title: { absolute: brandedTitle },
    description,
    applicationName: ORIGINALS.name,
    keywords: [
      "original web novels",
      "indie fiction",
      "online serial fiction",
      "web fiction",
      "independent authors",
      "Cuttlefish Originals",
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      type: openGraphType,
      url: canonical,
      title: brandedTitle,
      description,
      siteName: ORIGINALS.name,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: [socialImage],
    },
  };
}
