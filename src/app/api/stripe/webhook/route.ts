import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { creditStripeCheckoutSession } from "@/lib/credit-stripe-purchase";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const result = await creditStripeCheckoutSession(session);
  if (!result.ok) {
    console.error("Stripe fulfill failed:", result.error, session.id);
    throw new Error(result.error);
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Async payment methods complete the session before the money moves.
        // Acknowledge with 200 and credit later via async_payment_succeeded —
        // erroring here would make Stripe retry an event that never turns paid.
        if (session.payment_status !== "paid") break;
        await fulfillCheckoutSession(session);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    // Non-2xx so Stripe retries; credit_coins is idempotent.
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
