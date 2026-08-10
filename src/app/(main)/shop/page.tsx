import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { COIN_PACKAGES } from "@/lib/coin-packages";
import { SITE } from "@/lib/constants";
import { loginHref, safeReturnPath, shopHref } from "@/lib/safe-return-path";
import { isStripeConfigured } from "@/lib/stripe";
import { getAuthClaims } from "@/utils/supabase/auth";
import { CoinPackages } from "./_components/coin-packages";

export const metadata: Metadata = {
  title: "Shop",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const { return: returnParam } = await searchParams;
  const returnPath = safeReturnPath(returnParam);
  const claims = await getAuthClaims();
  if (!claims) {
    redirect(loginHref(shopHref(returnPath)));
  }

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const stripeEnabled = isStripeConfigured();

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12">
      <Suspense fallback={null}>
        <CoinPackages
          packages={COIN_PACKAGES}
          clientId={paypalClientId}
          stripeEnabled={stripeEnabled}
        />
      </Suspense>

      <p className="mt-6 text-xs text-muted">
        Cookie purchases are generally final. See our{" "}
        <Link
          href="/refund"
          className="font-medium text-foreground underline-offset-2 hover:text-accent hover:underline"
        >
          Refund Policy
        </Link>
        . Having issues? Email{" "}
        <a
          href={`mailto:${SITE.supportEmail}`}
          className="font-medium text-foreground underline-offset-2 hover:text-accent hover:underline"
        >
          {SITE.supportEmail}
        </a>{" "}
        — replies within 1 day.
      </p>
    </PageContainer>
  );
}
