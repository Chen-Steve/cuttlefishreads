// Server-side PayPal REST v2 helper. Talks to the Orders API directly so we
// don't depend on a specific server-SDK version. Used only from route handlers.

import { centsToAmountString, CURRENCY } from "@/lib/coin-packages";

const PAYPAL_BASE =
  process.env.PAYPAL_ENVIRONMENT === "live" ||
  process.env.PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PayPal credentials (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)."
    );
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}).`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export type PayPalOrder = {
  id: string;
  status: string;
};

export async function createPayPalOrder(params: {
  amountCents: number;
  customId: string;
  description: string;
}): Promise<PayPalOrder> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: CURRENCY,
            value: centsToAmountString(params.amountCents),
          },
          custom_id: params.customId,
          description: params.description,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${JSON.stringify(data)}`);
  }
  return data as PayPalOrder;
}

export type PayPalCapture = {
  status: string;
  captureId: string | null;
  customId: string | null;
  amountValue: string | null;
};

export async function capturePayPalOrder(
  orderId: string
): Promise<PayPalCapture> {
  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${JSON.stringify(data)}`);
  }

  const unit = data?.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];

  return {
    status: data?.status ?? capture?.status ?? "UNKNOWN",
    captureId: capture?.id ?? null,
    customId: capture?.custom_id ?? unit?.custom_id ?? null,
    amountValue: capture?.amount?.value ?? null,
  };
}
