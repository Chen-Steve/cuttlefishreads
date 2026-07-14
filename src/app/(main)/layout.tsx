import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/utils/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  let username: string | null = null;
  let coins = 0;
  let isAdmin = false;
  let isMasterAdmin = false;
  if (data?.claims) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, coins")
      .eq("id", data.claims.sub)
      .maybeSingle();
    username = profile?.username ?? null;
    coins = profile?.coins ?? 0;

    // Master admin check (env-based, always available).
    isMasterAdmin = isAdminEmail(data.claims.email as string | undefined);
    isAdmin = isMasterAdmin;

    // Translator role check — only possible after translators.sql has been run.
    // Fail silently so a missing column never breaks the header for everyone.
    if (!isAdmin) {
      try {
        const { data: roleRow } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.claims.sub)
          .maybeSingle();
        if (roleRow?.role === "translator") isAdmin = true;
      } catch {
        // column not yet added — ignore
      }
    }
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
        coins={coins}
        isAdmin={isAdmin}
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
