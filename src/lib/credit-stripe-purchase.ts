import type Stripe from "stripe";

import { computeOrder, CUSTOM_PACKAGE_ID } from "@/lib/coin-packages";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Credits cookies after a paid Checkout Session.
 * Reuses credit_coins() without a schema migration by storing Stripe IDs in
 * the existing paypal_* columns (cs_/pi_ prefixes never collide with PayPal).
 */
export async function creditStripeCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<{ ok: true; coins: number } | { ok: false; error: string }> {
  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment is not paid yet." };
  }

  const userId = session.metadata?.userId;
  const packageId = session.metadata?.packageId;
  const coins = Number.parseInt(session.metadata?.coins ?? "", 10);
  const expectedCents = Number.parseInt(session.metadata?.amountCents ?? "", 10);

  if (!userId || !packageId || !Number.isFinite(coins) || !Number.isFinite(expectedCents)) {
    return { ok: false, error: "Checkout session metadata is incomplete." };
  }

  const expected = computeOrder(
    packageId === CUSTOM_PACKAGE_ID
      ? { customCoins: coins }
      : { packageId }
  );

  const paidCents =
    typeof session.amount_total === "number" ? session.amount_total : null;

  if (
    !expected ||
    expected.coins !== coins ||
    expected.amountCents !== expectedCents ||
    paidCents !== expected.amountCents
  ) {
    console.error("Stripe checkout verification mismatch:", {
      packageId,
      coins,
      expectedCents,
      paidCents,
      expected,
    });
    return { ok: false, error: "Payment verification failed." };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Unique receipt keys for idempotency inside credit_coins.
  const orderKey = `stripe:${session.id}`;
  const captureKey = `stripe:${paymentIntentId ?? session.id}`;

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("credit_coins", {
      p_user_id: userId,
      p_package_id: packageId,
      p_coins: coins,
      p_amount_cents: paidCents,
      p_paypal_order_id: orderKey,
      p_paypal_capture_id: captureKey,
    });

    if (error) {
      console.error("credit_coins (stripe) error:", error);
      return { ok: false, error: "Crediting cookies failed." };
    }
  } catch (error) {
    console.error("Admin client / credit error (stripe):", error);
    return { ok: false, error: "Crediting cookies failed." };
  }

  return { ok: true, coins };
}
