import type { Metadata } from "next";
import { AdSenseAutoAds } from "@/components/adsense-auto-ads";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getUnreadNotificationCount } from "@/lib/notifications/data";
import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";
import { isAdminEmail } from "@/lib/admin";
import { ensureOAuthProfile } from "@/lib/profile";
import { hasProfileRole, parseProfileRoles } from "@/lib/roles";

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

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const claims = await getAuthClaims();
  const isAuthenticated = Boolean(claims);

  let username: string | null = null;
  let avatarUrl: string | null = null;
  let coins = 0;
  let isTranslator = false;
  let isMasterAdmin = false;
  let unreadNotifications = 0;
  if (claims) {
    const supabase = await getServerSupabase();
    const [{ data: profile }, unreadCount] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, coins, avatar_url, role")
        .eq("id", claims.sub)
        .maybeSingle(),
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
    coins = profile?.coins ?? 0;
    unreadNotifications = unreadCount;

    isMasterAdmin = isAdminEmail(claims.email as string | undefined);

    const roles = parseProfileRoles({
      role: profile?.role as string | null | undefined,
    });
    isTranslator = hasProfileRole(roles, "translator");
  }

  return (
    <>
      <AdSenseAutoAds />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to main content
      </a>
      <SiteHeader
        isAuthenticated={isAuthenticated}
        username={username}
        avatarUrl={avatarUrl}
        coins={coins}
        isTranslator={isTranslator}
        isMasterAdmin={isMasterAdmin}
        unreadNotifications={unreadNotifications}
      />
      <div className="contents [&:has([data-hide-main-footer])_footer]:hidden">
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
