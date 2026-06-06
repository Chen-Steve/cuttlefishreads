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
  if (data?.claims) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, coins")
      .eq("id", data.claims.sub)
      .maybeSingle();
    username = profile?.username ?? null;
    coins = profile?.coins ?? 0;

    // Master admin check (env-based, always available).
    isAdmin = isAdminEmail(data.claims.email as string | undefined);

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
      <SiteHeader
        isAuthenticated={isAuthenticated}
        username={username}
        coins={coins}
        isAdmin={isAdmin}
      />
      <div className="contents [&:has([data-hide-main-footer])_footer]:hidden">
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </>
  );
}
