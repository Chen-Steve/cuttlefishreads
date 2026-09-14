import type { MetadataRoute } from "next";

import { BLOCKED_CRAWLER_USER_AGENTS } from "@/lib/blocked-crawlers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: [...BLOCKED_CRAWLER_USER_AGENTS],
        disallow: "/",
      },
    ],
  };
}
