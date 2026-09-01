import type { Metadata } from "next";
import { Suspense } from "react";

import { AdSenseAutoAds } from "@/components/adsense-auto-ads";
import { SiteFooter } from "@/components/site-footer";
import {
  SiteHeaderFallback,
  SiteHeaderFromSession,
} from "@/components/site-header-from-session";

/** Private routes inherit this. Public pages opt in via `publicPageMetadata`. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdSenseAutoAds />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to main content
      </a>
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeaderFromSession />
      </Suspense>
      <div className="contents [&:has([data-hide-main-footer])_footer]:hidden">
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
