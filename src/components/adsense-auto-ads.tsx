"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/** Google Auto ads, loaded after idle. Omitted from admin, auth, and account pages. */
export function AdSenseAutoAds() {
  const pathname = usePathname();
  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return null;
  }

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7984663674761616"
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
