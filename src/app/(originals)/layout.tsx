import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OriginalsFooter } from "@/components/originals/originals-footer";
import { OriginalsHeader } from "@/components/originals/originals-header";
import { isAdminEmail } from "@/lib/admin";
import { ORIGINALS } from "@/lib/constants";
import { getUnreadNotificationCount } from "@/lib/forum/data";
import { originalsPublicOrigin, originalsPublicUrl } from "@/lib/hosts";
import { ensureOAuthProfile } from "@/lib/profile";
import { getUserOriginalSeries } from "@/lib/originals-data";
import { getAuthClaims } from "@/utils/supabase/auth";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  metadataBase: new URL(originalsPublicOrigin()),
  title: ORIGINALS.name,
  description: ORIGINALS.seoDescription,
  applicationName: ORIGINALS.name,
  category: "books",
  keywords: [
    "original web novels",
    "indie fiction",
    "online serial fiction",
    "web fiction",
    "independent authors",
    "Cuttlefish Originals",
  ],
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
  openGraph: {
    type: "website",
    url: originalsPublicUrl("/"),
    title: ORIGINALS.name,
    description: ORIGINALS.seoDescription,
    siteName: ORIGINALS.name,
    images: [originalsPublicUrl("/cuttle.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: ORIGINALS.name,
    description: ORIGINALS.seoDescription,
    images: [originalsPublicUrl("/cuttle.png")],
  },
};

export default async function OriginalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const claims = await getAuthClaims();
  const isAuthenticated = Boolean(claims);

  let username: string | null = null;
  let avatarUrl: string | null = null;
  let isMasterAdmin = false;
  let hasCreatorSubdomain = false;
  let unreadNotifications = 0;

  if (claims) {
    const supabase = createClient(await cookies());
    const [{ data: profile }, originalSeries, unreadCount] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", claims.sub)
        .maybeSingle(),
      getUserOriginalSeries(claims.sub),
      getUnreadNotificationCount(claims.sub),
    ]);
    username = profile?.username ?? null;
    if (!username) {
      await ensureOAuthProfile(
        claims.sub,
        claims.email as string | undefined,
      );
      const { data: refreshed } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", claims.sub)
        .maybeSingle();
      username = refreshed?.username ?? null;
    }
    avatarUrl = profile?.avatar_url ?? null;
    isMasterAdmin = isAdminEmail(claims.email as string | undefined);
    hasCreatorSubdomain = originalSeries.length > 0;
    unreadNotifications = unreadCount;
  }

  return (
    <div
      data-surface="originals"
      className="flex min-h-full flex-1 flex-col bg-background text-foreground [--accent:#2f5d56] [--accent-hover:#254a45] [--accent-foreground:#f4faf8] dark:[--accent:#7eb8ae] dark:[--accent-hover:#9bcdc5] dark:[--accent-foreground:#12201e]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to main content
      </a>
      <OriginalsHeader
        isAuthenticated={isAuthenticated}
        username={username}
        avatarUrl={avatarUrl}
        isMasterAdmin={isMasterAdmin}
        hasCreatorSubdomain={hasCreatorSubdomain}
        unreadNotifications={unreadNotifications}
      />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <OriginalsFooter />
    </div>
  );
}
