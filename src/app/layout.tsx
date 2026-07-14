import type { Metadata } from "next";
import Script from "next/script";
import { GoogleAnalyticsPageViews } from "@/components/google-analytics-page-views";
import { Toaster } from "@/components/ui/sonner";
import { nationalPark } from "@/lib/fonts";
import { readerFontVariables } from "@/lib/reader-fonts";
import { SITE } from "@/lib/constants";
import { GA_MEASUREMENT_ID } from "@/lib/google-analytics-id";
import { siteUrl } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${SITE.name} | Home`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.seoDescription,
  applicationName: SITE.name,
  keywords: [
    "Cuttlefish Reads",
    "cuttlefishreads",
    "web novels",
    "read novels online",
    "translated novels",
    "light novels",
  ],
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: "Cuttlefish Reads" }],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <GoogleAnalyticsPageViews />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
