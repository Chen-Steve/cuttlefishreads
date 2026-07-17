import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Cookie, ExternalLink } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { getUserComments } from "@/lib/data";
import { signOut } from "@/app/(main)/(auth)/actions";
import { AccountComments } from "./_components/account-comments";
import { AvatarForm } from "./_components/avatar-form";
import { UsernameForm } from "./_components/username-form";
import {
  CUSTOM_PACKAGE_ID,
  getPackageById,
  centsToAmountString,
} from "@/lib/coin-packages";

export const metadata: Metadata = {
  title: "Account",
};

function packageLabel(id: string): string {
  if (id === CUSTOM_PACKAGE_ID) return "Custom amount";
  return getPackageById(id)?.label ?? id;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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
  let novelTitles = new Map<string, string>();
  if (uniqueSlugs.length > 0) {
    const { data: novels } = await supabase
      .from("novels")
      .select("slug, title")
      .in("slug", uniqueSlugs);
    novelTitles = new Map((novels ?? []).map((n) => [n.slug, n.title]));
  }

  const purchaseRows = purchases ?? [];
  const unlockRows = unlocks ?? [];

  return (
    <PageContainer
      as="section"
      className="flex flex-col gap-5 py-6 sm:gap-6 sm:py-8 lg:py-10"
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

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Username
                </p>
                {profile?.username ? (
                  <Link
                    href={`/u/${profile.username}`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-accent transition-colors hover:text-accent-hover"
                  >
                    View profile
                    <ExternalLink className="size-3" strokeWidth={2} aria-hidden />
                  </Link>
                ) : null}
              </div>
              <UsernameForm currentUsername={profile?.username ?? null} />
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-border/70 pt-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Email
              </span>
              <span className="truncate text-sm text-foreground">{email}</span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Cookie
                  className="size-4 shrink-0 text-amber-500"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    Balance
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {(profile?.coins ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <Link
                href="/shop"
                className="text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
              >
                Buy cookies
              </Link>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-5 sm:gap-6">
          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Purchases</h2>
              <span className="text-[11px] tabular-nums text-muted">
                {purchaseRows.length}
              </span>
            </div>

            {purchaseRows.length > 0 ? (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {purchaseRows.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {packageLabel(p.package_id)}
                      </p>
                      <p className="text-[11px] text-muted">
                        {formatDate(p.created_at)} · ${centsToAmountString(p.amount_cents)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      +{p.coins.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
                No purchases yet.{" "}
                <Link
                  href="/shop"
                  className="font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  Visit the shop
                </Link>
              </p>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Unlocks</h2>
              <span className="text-[11px] tabular-nums text-muted">
                {unlockRows.length}
              </span>
            </div>

            {unlockRows.length > 0 ? (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {unlockRows.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/novels/${u.novel_slug}`}
                        className="block truncate font-medium text-foreground transition-colors hover:text-accent"
                      >
                        {novelTitles.get(u.novel_slug) ?? u.novel_slug}
                      </Link>
                      <p className="text-[11px] text-muted">
                        {formatDate(u.created_at)} · Ch. {u.chapter_number}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      −{u.coins_spent.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
                No chapter unlocks yet.
              </p>
            )}
          </section>

          <AccountComments comments={comments} />
        </div>
      </div>
    </PageContainer>
  );
}
