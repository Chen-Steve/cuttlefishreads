"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { GA_MEASUREMENT_ID } from "@/lib/google-analytics-id";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a GA4 page_view on App Router client navigations so chapter reads are
 * counted. The initial full-page load is already tracked by the root gtag config.
 */
export function GoogleAnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (!pathname || typeof window.gtag !== "function") return;

    // Skip the first run — gtag('config') already sent that page_view.
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: pagePath,
    });
  }, [pathname, searchParams]);

  return null;
}
