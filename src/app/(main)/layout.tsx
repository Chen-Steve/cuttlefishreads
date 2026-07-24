import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/utils/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { hasProfileRole, parseProfileRoles } from "@/lib/roles";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  let username: string | null = null;
  let avatarUrl: string | null = null;
  let coins = 0;
  let isTranslator = false;
  let isMasterAdmin = false;
  if (data?.claims) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, coins, avatar_url, role, roles")
      .eq("id", data.claims.sub)
      .maybeSingle();
    username = profile?.username ?? null;
    avatarUrl = profile?.avatar_url ?? null;
    coins = profile?.coins ?? 0;

    isMasterAdmin = isAdminEmail(data.claims.email as string | undefined);

    const roles = parseProfileRoles({
      roles: profile?.roles as string[] | null | undefined,
      role: profile?.role as string | null | undefined,
    });
    isTranslator = hasProfileRole(roles, "translator");
  }

  return (
    <>
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
