import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { COIN_PACKAGES } from "@/lib/coin-packages";
import { CoinPackages } from "./_components/coin-packages";

export const metadata: Metadata = {
  title: "Shop",
};

export default async function ShopPage() {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect("/login");

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;

  return (
    <PageContainer as="section">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Cookie Shop
      </h1>

      <CoinPackages packages={COIN_PACKAGES} clientId={paypalClientId} />
    </PageContainer>
  );
}
