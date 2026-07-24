import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { creatorPublicOrigin, originalsPublicUrl } from "@/lib/hosts";
import { getUserOriginalSeries } from "@/lib/originals-data";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { AccountSection } from "@/app/(main)/account/_components/account-section";
import { AvatarForm } from "@/app/(main)/account/_components/avatar-form";
import { PasswordForm } from "@/app/(main)/account/_components/password-form";
import { UsernameForm } from "@/app/(main)/account/_components/username-form";

export const metadata: Metadata = {
  title: "Account",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OriginalsAccountPage() {
  const supabase = createClient(await cookies());

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login?redirect=/account");
  }

  const { sub: userId, email } = data.claims;

  const [{ data: profile }, originalSeries] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    getUserOriginalSeries(userId),
  ]);

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
          <input type="hidden" name="redirectTo" value="/" />
          <button
            type="submit"
            className="text-xs font-medium text-muted transition-colors hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Sign out
          </button>
        </form>
      </div>

      <section className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-3.5 sm:p-4">
        <div className="flex flex-col gap-3">
          <AvatarForm currentAvatarUrl={profile?.avatar_url ?? null} />

          <AccountSection
            title="Username"
            storageKey="cf-originals-account-username"
            className="border-t-0 pt-0"
            headerAside={
              profile?.username ? (
                <Link
                  href={
                    originalSeries.length > 0
                      ? creatorPublicOrigin(profile.username)
                      : originalsPublicUrl(`/profiles/${profile.username}`)
                  }
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

          <AccountSection
            title="Email"
            storageKey="cf-originals-account-email"
          >
            <p className="truncate text-sm text-foreground">{email}</p>
          </AccountSection>

          <AccountSection
            title="Password"
            storageKey="cf-originals-account-password"
            defaultOpen={false}
          >
            <PasswordForm />
          </AccountSection>
        </div>
      </section>
    </PageContainer>
  );
}
