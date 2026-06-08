import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { computeOrder, CUSTOM_PACKAGE_ID } from "@/lib/coin-packages";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = data.claims.sub;

  const body = await request.json().catch(() => null);
  const orderId = body?.orderId ? String(body.orderId) : null;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  }

  // 1. Capture the payment with PayPal.
  let capture;
  try {
    capture = await capturePayPalOrder(orderId);
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.json(
      { error: "Could not complete the payment." },
      { status: 502 }
    );
  }

  if (capture.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Payment was not completed." },
      { status: 402 }
    );
  }

  if (!capture.captureId || !capture.customId || !capture.amountValue) {
    console.error("PayPal capture missing fields:", capture);
    return NextResponse.json(
      { error: "Payment response was incomplete." },
      { status: 502 }
    );
  }

  // 2. Decode custom_id (set by us at order creation) and re-verify everything
  //    server-side so a tampered request can't credit extra coins.
  const [customUserId, packageId, coinsStr] = capture.customId.split(":");
  const coins = Number.parseInt(coinsStr, 10);

  if (customUserId !== userId) {
    return NextResponse.json(
      { error: "This order does not belong to you." },
      { status: 403 }
    );
  }

  const expected = computeOrder(
    packageId === CUSTOM_PACKAGE_ID
      ? { customCoins: coins }
      : { packageId }
  );

  const capturedCents = Math.round(Number.parseFloat(capture.amountValue) * 100);

  if (!expected || expected.coins !== coins || expected.amountCents !== capturedCents) {
    console.error("PayPal capture verification mismatch:", {
      packageId,
      coins,
      capturedCents,
      expected,
    });
    return NextResponse.json(
      { error: "Payment verification failed." },
      { status: 400 }
    );
  }

  // 3. Credit coins atomically (idempotent on the capture id).
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("credit_coins", {
      p_user_id: userId,
      p_package_id: packageId,
      p_coins: coins,
      p_amount_cents: capturedCents,
      p_paypal_order_id: orderId,
      p_paypal_capture_id: capture.captureId,
    });

    if (error) {
      console.error("credit_coins error:", error);
      return NextResponse.json(
        { error: "Payment captured but crediting cookies failed. Contact support." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Admin client / credit error:", error);
    return NextResponse.json(
      { error: "Payment captured but crediting cookies failed. Contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, coins });
}
