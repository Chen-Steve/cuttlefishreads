import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { GoogleAnalyticsPageViews } from "@/components/google-analytics-page-views";
import { InlineScript } from "@/components/inline-script";
import { Toaster } from "@/components/ui/sonner";
import { analyticsConsentInitScript } from "@/lib/analytics-consent";
import { SITE } from "@/lib/constants";
import { nationalPark } from "@/lib/fonts";
import { readerFontVariables } from "@/lib/reader-fonts";
import { GA_MEASUREMENT_ID } from "@/lib/google-analytics-id";
import { siteUrl } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1916" },
  ],
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: SITE.name,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.seoDescription,
  icons: {
    icon: "/cuttle.ico",
    apple: "/cuttle.png",
  },
  verification: {
    google: "2KUBSqgtMFqO85PxbI9vc_QYd1ZRQ2u05kSDa-yKv74",
    other: {
      "google-adsense-account": "ca-pub-7984663674761616",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nationalPark.className} ${nationalPark.variable} ${readerFontVariables} h-full antialiased`}
    >
      <head>
        <InlineScript html={themeInitScript} />
        <InlineScript html={analyticsConsentInitScript(GA_MEASUREMENT_ID)} />
      </head>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <GoogleAnalyticsPageViews />
        {children}
        <CookieConsentBanner />
        <Toaster />
      </body>
    </html>
  );
}
