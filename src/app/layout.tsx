import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { nationalPark } from "@/lib/fonts";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuttlefish Reads",
  description: "A calm place to discover and read novels",
  icons: {
    icon: "/cuttle.png",
    apple: "/cuttle.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  let username: string | null = null;
  if (data?.claims) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.claims.sub)
      .maybeSingle();
    username = profile?.username ?? null;
  }

  return (
    <html
      lang="en"
      className={`${nationalPark.className} ${nationalPark.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader isAuthenticated={isAuthenticated} username={username} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
