import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/(main)/(auth)/actions";
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

  const [{ data: profile }, { data: purchases }] = await Promise.all([
    supabase.from("profiles").select("username, coins").eq("id", userId).maybeSingle(),
    supabase
      .from("coin_purchases")
      .select("id, package_id, coins, amount_cents, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <PageContainer as="section">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Account
      </h1>

      <dl className="mt-6 max-w-md divide-y divide-border rounded-2xl border border-border bg-surface px-5 py-1">
        <div className="flex items-center justify-between gap-4 py-3.5">
          <dt className="text-sm text-muted">Username</dt>
          <dd className="text-sm font-medium text-foreground">
            {profile?.username ?? "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3.5">
          <dt className="text-sm text-muted">Email</dt>
          <dd className="text-sm font-medium text-foreground">{email}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3.5">
          <dt className="text-sm text-muted">Coin balance</dt>
          <dd className="text-sm font-semibold text-foreground">
            {(profile?.coins ?? 0).toLocaleString()} coins
          </dd>
        </div>
      </dl>

      {/* Purchase history */}
      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Purchase history</h2>
        <Link
          href="/shop"
          className="text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Buy coins
        </Link>
      </div>

      {purchases && purchases.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 text-right font-medium">Coins</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-muted">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    {packageLabel(p.package_id)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-amber-600">
                    +{p.coins.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-foreground">
                    ${centsToAmountString(p.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-border bg-surface px-5 py-8 text-center text-sm text-muted">
          No purchases yet.{" "}
          <Link
            href="/shop"
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Visit the shop
          </Link>{" "}
          to buy coins.
        </p>
      )}

      <form action={signOut} className="mt-10">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-dashed border-red-500 bg-background px-5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          Sign out
        </button>
      </form>
    </PageContainer>
  );
}
