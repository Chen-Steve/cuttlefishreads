import type { MetadataRoute } from "next";
import { mainPublicOrigin } from "@/lib/hosts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${mainPublicOrigin()}/`,
    },
  ];
}
