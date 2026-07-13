import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { creditStripeCheckoutSession } from "@/lib/credit-stripe-purchase";
import { getStripe } from "@/lib/stripe";

/**
 * Backup fulfillment when the webhook is delayed/misconfigured.
 * Verifies the Checkout Session with Stripe, then credits cookies
 * (idempotent via credit_coins).
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = data.claims.sub;

  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId ? String(body.sessionId) : null;
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== userId) {
      return NextResponse.json(
        { error: "This order does not belong to you." },
        { status: 403 }
      );
    }

    const result = await creditStripeCheckoutSession(session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 402 });
    }

    return NextResponse.json({ success: true, coins: result.coins });
  } catch (error) {
    console.error("Stripe confirm-session error:", error);
    return NextResponse.json(
      { error: "Could not confirm the payment." },
      { status: 502 }
    );
  }
}
