import { cookies } from "next/headers";
import { OriginalsFooter } from "@/components/originals/originals-footer";
import { OriginalsHeader } from "@/components/originals/originals-header";
import { isAdminEmail } from "@/lib/admin";
import { getUserOriginalSeries } from "@/lib/originals-data";
import { createClient } from "@/utils/supabase/server";

export default async function OriginalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  let username: string | null = null;
  let avatarUrl: string | null = null;
  let isMasterAdmin = false;
  let hasCreatorSubdomain = false;

  if (data?.claims) {
    const [{ data: profile }, originalSeries] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", data.claims.sub)
        .maybeSingle(),
      getUserOriginalSeries(data.claims.sub),
    ]);
    username = profile?.username ?? null;
    avatarUrl = profile?.avatar_url ?? null;
    isMasterAdmin = isAdminEmail(data.claims.email as string | undefined);
    hasCreatorSubdomain = originalSeries.length > 0;
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
      />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <OriginalsFooter />
    </div>
  );
}
