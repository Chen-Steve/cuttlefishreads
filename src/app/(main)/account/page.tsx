import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Cookie, ExternalLink } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { getUserComments } from "@/lib/data";
import { signOut } from "@/app/(auth)/actions";
import { AccountActivity } from "./_components/account-activity";
import { AccountSection } from "./_components/account-section";
import { AvatarForm } from "./_components/avatar-form";
import { PasswordForm } from "./_components/password-form";
import { UsernameForm } from "./_components/username-form";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const supabase = createClient(await cookies());

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login");
  }

  const { sub: userId, email } = data.claims;

  const [{ data: profile }, { data: purchases }, { data: unlocks }, comments] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, coins, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("coin_purchases")
        .select("id, package_id, coins, amount_cents, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("chapter_unlocks")
        .select("id, novel_slug, chapter_number, coins_spent, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      getUserComments(userId as string),
    ]);

  const uniqueSlugs = [...new Set((unlocks ?? []).map((u) => u.novel_slug))];
  const novelTitles: Record<string, string> = {};
  if (uniqueSlugs.length > 0) {
    const { data: novels } = await supabase
      .from("novels")
      .select("slug, title")
      .in("slug", uniqueSlugs);
    for (const novel of novels ?? []) {
      novelTitles[novel.slug] = novel.title;
    }
  }

  return (
    <PageContainer
      as="section"
      className="flex flex-col gap-2 !py-3 sm:gap-6 sm:!py-8 lg:!py-10"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          Account
        </h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs font-medium text-muted transition-colors hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <section className="rounded-xl border border-border bg-surface p-3.5 sm:p-4">
          <div className="flex flex-col gap-3">
            <AvatarForm currentAvatarUrl={profile?.avatar_url ?? null} />

            <AccountSection
              title="Username"
              storageKey="cf-account-section-username"
              className="border-t-0 pt-0"
              headerAside={
                profile?.username ? (
                  <Link
                    href={`/u/${profile.username}`}
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-accent transition-colors hover:text-accent-hover"
                  >
                    View profile
                    <ExternalLink className="size-3" strokeWidth={2} aria-hidden />
                  </Link>
                ) : null
              }
            >
              <UsernameForm currentUsername={profile?.username ?? null} />
            </AccountSection>

            <AccountSection title="Email" storageKey="cf-account-section-email">
              <p className="truncate text-sm text-foreground">{email}</p>
            </AccountSection>

            <AccountSection
              title="Password"
              storageKey="cf-account-section-password"
              defaultOpen={false}
            >
              <PasswordForm />
            </AccountSection>

            <AccountSection
              title="Balance"
              storageKey="cf-account-section-balance"
            >
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Cookie
                    className="size-4 shrink-0 text-amber-500"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {(profile?.coins ?? 0).toLocaleString()}
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  Buy cookies
                </Link>
              </div>
            </AccountSection>
          </div>
        </section>

        <AccountSection
          title="Activity"
          storageKey="cf-account-section-activity"
          className="border-t-0 pt-0"
        >
          <AccountActivity
            purchases={purchases ?? []}
            unlocks={unlocks ?? []}
            novelTitles={novelTitles}
            comments={comments}
          />
        </AccountSection>
      </div>
    </PageContainer>
  );
}
