import type { MetadataRoute } from "next";
import { mainPublicOrigin } from "@/lib/hosts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/library",
        "/notifications",
        "/shop",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/apply",
      ],
    },
    sitemap: `${mainPublicOrigin()}/sitemap.xml`,
  };
}
