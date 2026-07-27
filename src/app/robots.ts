import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  isOriginalsDomain,
  originalsPublicUrl,
  resolveRequestHost,
} from "@/lib/hosts";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = resolveRequestHost((await headers()).get("host"));

  if (!isOriginalsDomain(host)) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/workspace",
        "/account",
        "/library",
        "/forum/inbox",
        "/forum/manage",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: originalsPublicUrl("/sitemap.xml"),
  };
}
