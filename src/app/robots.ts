import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/originals/workspace/",
        "/workspace",
        "/account/",
        "/originals/account/",
        "/library/",
        "/todos/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
