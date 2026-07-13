import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { COIN_PACKAGES } from "@/lib/coin-packages";
import { SITE } from "@/lib/constants";
import { isStripeConfigured } from "@/lib/stripe";
import { CoinPackages } from "./_components/coin-packages";

export const metadata: Metadata = {
  title: "Shop",
};

export default async function ShopPage() {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect("/login");

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const stripeEnabled = isStripeConfigured();

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Cookie Shop
      </h1>

      <Suspense fallback={null}>
        <CoinPackages
          packages={COIN_PACKAGES}
          clientId={paypalClientId}
          stripeEnabled={stripeEnabled}
        />
      </Suspense>

      <p className="mt-6 text-xs text-muted">
        Having issues?{" "}
        <a
          href={SITE.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline-offset-2 hover:text-accent hover:underline"
        >
          Contact us on Discord
        </a>
        .
      </p>
    </PageContainer>
  );
}
