import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { COIN_PACKAGES } from "@/lib/coin-packages";
import { CoinPackages } from "./_components/coin-packages";
import { CoinIcon } from "./_components/coin-icon";

export const metadata: Metadata = {
  title: "Shop",
};

export default async function ShopPage() {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect("/login");

  const { sub: userId } = data.claims;

  const { data: profile } = await supabase
    .from("profiles")
    .select("coins")
    .eq("id", userId)
    .maybeSingle();

  // clientId is public/safe to expose; passed to the client component as a prop.
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;

  return (
    <PageContainer as="section">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Coin Shop
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start rounded-2xl border border-border bg-surface px-4 py-2.5 sm:self-auto">
          <CoinIcon className="size-5 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">
            {(profile?.coins ?? 0).toLocaleString()}
          </span>
          <span className="text-sm text-muted">coins</span>
        </div>
      </div>

      <CoinPackages packages={COIN_PACKAGES} clientId={paypalClientId} />
    </PageContainer>
  );
}
