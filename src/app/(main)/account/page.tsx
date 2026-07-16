import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/(main)/(auth)/actions";
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

  // getClaims() validates the JWT signature — safe for protecting server routes.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login");
  }

  const { sub: userId, email } = data.claims;

  const [{ data: profile }, { data: purchases }, { data: unlocks }] =
    await Promise.all([
      supabase.from("profiles").select("username, coins").eq("id", userId).maybeSingle(),
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
    ]);

  // Resolve novel titles for the unlock rows.
  const uniqueSlugs = [...new Set((unlocks ?? []).map((u) => u.novel_slug))];
  let novelTitles = new Map<string, string>();
  if (uniqueSlugs.length > 0) {
    const { data: novels } = await supabase
      .from("novels")
      .select("slug, title")
      .in("slug", uniqueSlugs);
    novelTitles = new Map((novels ?? []).map((n) => [n.slug, n.title]));
  }

  return (
    <PageContainer as="section">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Account
      </h1>

      <dl className="mt-4 max-w-md divide-y divide-border rounded-2xl border border-border bg-surface px-4">
        <div className="flex flex-col gap-2 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted">Username</dt>
            {profile?.username && (
              <dd className="text-sm font-medium">
                <Link
                  href={`/u/${profile.username}`}
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  {profile.username}
                </Link>
              </dd>
            )}
          </div>
          <UsernameForm currentUsername={profile?.username ?? null} />
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-sm text-muted">Email</dt>
          <dd className="text-sm font-medium text-foreground">{email}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-sm text-muted">Cookie balance</dt>
          <dd className="text-sm font-semibold text-foreground">
            {(profile?.coins ?? 0).toLocaleString()} cookies
          </dd>
        </div>
      </dl>

      {/* Purchase history */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Purchase history</h2>
        <Link
          href="/shop"
          className="text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Buy cookies
        </Link>
      </div>

      {purchases && purchases.length > 0 ? (
        <div className="mt-2.5 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Package</th>
                <th className="px-4 py-2 text-right font-medium">Cookies</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-4 py-2 font-medium text-foreground">
                    {packageLabel(p.package_id)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-amber-600 dark:text-amber-400">
                    +{p.coins.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-foreground">
                    ${centsToAmountString(p.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2.5 rounded-2xl border border-border bg-surface px-4 py-5 text-center text-sm text-muted">
          No purchases yet.{" "}
          <Link
            href="/shop"
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Visit the shop
          </Link>{" "}
          to buy cookies.
        </p>
      )}

      {/* Chapter unlocks */}
      <h2 className="mt-6 text-base font-semibold tracking-tight">Chapter unlocks</h2>

      {unlocks && unlocks.length > 0 ? (
        <div className="mt-2.5 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Novel</th>
                <th className="px-4 py-2 font-medium">Chapter</th>
                <th className="px-4 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {unlocks.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-2 font-medium text-foreground">
                    <Link
                      href={`/novels/${u.novel_slug}`}
                      className="text-accent transition-colors hover:text-accent-hover"
                    >
                      {novelTitles.get(u.novel_slug) ?? u.novel_slug}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-foreground">
                    Ch. {u.chapter_number}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-amber-600 dark:text-amber-400">
                    −{u.coins_spent.toLocaleString()} cookies
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2.5 rounded-2xl border border-border bg-surface px-4 py-5 text-center text-sm text-muted">
          No chapter unlocks yet.
        </p>
      )}

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-dashed border-red-500 bg-background px-4 text-sm font-semibold text-red-500 dark:text-red-400 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          Sign out
        </button>
      </form>
    </PageContainer>
  );
}
