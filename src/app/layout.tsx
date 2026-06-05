import type { Metadata } from "next";
import { nationalPark } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuttlefish Reads",
  description: "A calm place to discover and read novels",
  icons: {
    icon: "/cuttle.ico",
    apple: "/cuttle.png",
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
