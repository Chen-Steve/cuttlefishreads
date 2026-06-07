import type { Metadata } from "next";
import Script from "next/script";
import { nationalPark } from "@/lib/fonts";
import { SITE } from "@/lib/constants";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${SITE.name} | Read Popular and Niche Novels Online`,
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
  openGraph: {
    title: `${SITE.name} | Read Popular and Niche Novels Online`,
    description: SITE.seoDescription,
    url: "/",
    siteName: SITE.name,
    type: "website",
    images: [
      {
        url: "/cuttle.png",
        alt: SITE.name,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE.name} | Read Popular and Niche Novels Online`,
    description: SITE.seoDescription,
    images: ["/cuttle.png"],
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
      className={`${nationalPark.className} ${nationalPark.variable} h-full antialiased`}
    >
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-LJ3SXGLR01"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-LJ3SXGLR01');
        `}
      </Script>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
