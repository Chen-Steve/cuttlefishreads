import type { Metadata } from "next";
import Script from "next/script";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { GoogleAnalyticsPageViews } from "@/components/google-analytics-page-views";
import { InlineScript } from "@/components/inline-script";
import { Toaster } from "@/components/ui/sonner";
import { analyticsConsentInitScript } from "@/lib/analytics-consent";
import { nationalPark } from "@/lib/fonts";
import { readerFontVariables } from "@/lib/reader-fonts";
import { GA_MEASUREMENT_ID } from "@/lib/google-analytics-id";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: "/cuttle.ico",
    apple: "/cuttle.png",
  },
  verification: {
    google: "2KUBSqgtMFqO85PxbI9vc_QYd1ZRQ2u05kSDa-yKv74",
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
