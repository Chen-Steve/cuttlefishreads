import Stripe from "stripe";

import { absoluteUrl } from "@/lib/seo";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
    });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function shopReturnUrl(
  status: "success" | "cancel",
  returnPath?: string,
) {
  const url = new URL(absoluteUrl(`/shop?stripe=${status}`));
  if (returnPath) {
    url.searchParams.set("return", returnPath);
  }
  return url.toString();
}
