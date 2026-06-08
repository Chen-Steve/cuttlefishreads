import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { computeOrder, type OrderInput } from "@/lib/coin-packages";
import { createPayPalOrder } from "@/lib/paypal";

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

  // Encode who/what into custom_id so the capture step can credit the right
  // user the right number of coins, without trusting any client input.
  const customId = `${userId}:${order.packageId}:${order.coins}`;

  try {
    const ppOrder = await createPayPalOrder({
      amountCents: order.amountCents,
      customId,
      description: `${order.coins} cookies`,
    });
    return NextResponse.json({ id: ppOrder.id });
  } catch (error) {
    console.error("PayPal create-order error:", error);
    return NextResponse.json(
      { error: "Could not start the payment. Please try again." },
      { status: 502 }
    );
  }
}
