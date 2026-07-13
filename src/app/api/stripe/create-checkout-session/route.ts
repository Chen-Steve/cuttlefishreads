import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { computeOrder, CURRENCY, type OrderInput } from "@/lib/coin-packages";
import { getStripe, shopReturnUrl } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = data.claims.sub;

  const body = await request.json().catch(() => null);

  let input: OrderInput | null = null;
  if (body?.packageId) {
    input = { packageId: String(body.packageId) };
  } else if (body?.customCoins != null) {
    input = { customCoins: Number(body.customCoins) };
  }

  if (!input) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const order = computeOrder(input);
  if (!order) {
    return NextResponse.json(
      { error: "Invalid package or cookie amount." },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${shopReturnUrl("success")}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: shopReturnUrl("cancel"),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY.toLowerCase(),
            unit_amount: order.amountCents,
            product_data: {
              name: "cuttl",
              description: `${order.coins} cookies`,
            },
          },
        },
      ],
      metadata: {
        userId,
        packageId: order.packageId,
        coins: String(order.coins),
        amountCents: String(order.amountCents),
      },
      payment_intent_data: {
        metadata: {
          userId,
          packageId: order.packageId,
          coins: String(order.coins),
          amountCents: String(order.amountCents),
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not start the payment. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe create-checkout-session error:", error);
    return NextResponse.json(
      { error: "Could not start the payment. Please try again." },
      { status: 502 }
    );
  }
}
