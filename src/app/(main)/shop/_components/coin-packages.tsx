"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cookie } from "lucide-react";

import {
  type CoinPackage,
  type OrderInput,
  MIN_COINS,
  MAX_COINS,
  CENTS_PER_COIN,
  centsToAmountString,
} from "@/lib/coin-packages";
import { usePayPal } from "./use-paypal";
import { PayPalPayButton } from "./paypal-pay-button";
import { StripePayButton } from "./stripe-pay-button";

export function CoinPackages({
  packages,
  clientId,
  stripeEnabled = false,
}: {
  packages: readonly CoinPackage[];
  clientId?: string;
  stripeEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, startPurchase } = usePayPal(clientId);

  const [customCoins, setCustomCoins] = useState<number | "">(MIN_COINS);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [stripePendingId, setStripePendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validCustomCoins =
    typeof customCoins === "number" &&
    customCoins >= MIN_COINS &&
    customCoins <= MAX_COINS
      ? customCoins
      : null;
  const customPriceCents = validCustomCoins
    ? validCustomCoins * CENTS_PER_COIN
    : null;

  const paypalReady = Boolean(clientId) && ready;
  const anyPaymentMethod = paypalReady || stripeEnabled;
  const busy = pendingId !== null || stripePendingId !== null;

  useEffect(() => {
    const status = searchParams.get("stripe");
    if (!status) return;

    const sessionId = searchParams.get("session_id");

    if (status === "cancel") {
      setError("Stripe checkout was canceled.");
      router.replace("/shop", { scroll: false });
      return;
    }

    if (status !== "success") return;

    let cancelled = false;

    (async () => {
      try {
        if (sessionId) {
          const res = await fetch("/api/stripe/confirm-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (res.ok && data.coins != null) {
            setSuccess(`Success! ${data.coins} cookies added to your balance.`);
          } else {
            setSuccess(
              "Payment received. Cookies will appear in your balance shortly."
            );
          }
        } else {
          setSuccess(
            "Payment received. Cookies will appear in your balance shortly."
          );
        }
        router.refresh();
      } catch {
        if (!cancelled) {
          setSuccess(
            "Payment received. Cookies will appear in your balance shortly."
          );
        }
      } finally {
        if (!cancelled) router.replace("/shop", { scroll: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  async function buyWithPayPal(input: OrderInput, id: string) {
    if (!paypalReady || busy) return;
    setError(null);
    setSuccess(null);
    setPendingId(id);

    const createOrder = async () => {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the payment.");
      return { orderId: data.id as string };
    };

    try {
      await startPurchase(createOrder, {
        onApprove: async (data) => {
          const res = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderId }),
          });
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.error ?? "Payment could not be completed.");
          }
          setSuccess(`Success! ${result.coins} cookies added to your balance.`);
          router.refresh();
        },
        onCancel: () => setPendingId(null),
        onError: () => {
          setError("Something went wrong with PayPal. Please try again.");
          setPendingId(null);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPendingId(null);
    }
  }

  async function buyWithStripe(input: OrderInput, id: string) {
    if (!stripeEnabled || busy) return;
    setError(null);
    setSuccess(null);
    setStripePendingId(id);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start the payment.");
      }
      if (!data.url) {
        throw new Error("Could not start the payment.");
      }
      window.location.assign(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
      setStripePendingId(null);
    }
  }

  const paypalDisabled = !paypalReady || busy;
  const stripeDisabled = !stripeEnabled || busy;

  return (
    <>
      {/* Status banners */}
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700"
        >
          {success}
        </p>
      )}

      {/* Preset packages */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {packages.map((pkg) => {
          const totalCoins = pkg.coins + pkg.bonusCoins;
          const dollars = pkg.price / 100;

          return (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-2xl border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md ${
                pkg.highlight ? "border-accent" : "border-border"
              }`}
            >
              {pkg.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                  Best deal
                </span>
              )}

              <p className="text-sm font-semibold text-foreground">{pkg.label}</p>
              <p className="mt-0.5 text-xs text-muted">{pkg.description}</p>

              <div className="mt-4 flex h-8 items-end gap-1.5">
                <Cookie className="size-7 shrink-0 text-amber-500" strokeWidth={1.75} aria-hidden />
                <span className="translate-y-[3px] text-3xl font-bold leading-none tracking-tight tabular-nums text-foreground">
                  {totalCoins}
                </span>
                <span className="text-sm leading-none text-muted">cookies</span>
              </div>

              {pkg.bonusCoins > 0 && (
                <p className="mt-1 text-xs font-medium text-accent">
                  +{pkg.bonusCoins} bonus cookies included
                </p>
              )}

              <p className="mt-3 text-2xl font-semibold text-foreground">
                ${dollars.toFixed(2)}
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <PayPalPayButton
                  unavailable={!clientId}
                  loading={Boolean(clientId) && !ready}
                  disabled={paypalDisabled}
                  onPay={() => buyWithPayPal({ packageId: pkg.id }, pkg.id)}
                />
                <StripePayButton
                  unavailable={!stripeEnabled}
                  loading={stripePendingId === pkg.id}
                  disabled={stripeDisabled}
                  onPay={() => buyWithStripe({ packageId: pkg.id }, pkg.id)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom amount */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <p className="text-sm font-semibold text-foreground">Custom amount</p>
        <p className="mt-0.5 text-xs text-muted">
          minimum {MIN_COINS}, maximum {MAX_COINS.toLocaleString()}.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom-cookies" className="text-xs font-medium text-muted">
              Number of cookies
            </label>
            <div className="relative">
              <Cookie className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-amber-500" strokeWidth={1.75} aria-hidden />
              <input
                id="custom-cookies"
                type="number"
                min={MIN_COINS}
                max={MAX_COINS}
                step={1}
                value={customCoins}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCustomCoins(raw === "" ? "" : parseInt(raw, 10));
                }}
                placeholder={String(MIN_COINS)}
                className="h-11 w-full rounded-xl border border-border bg-background py-0 pr-3.5 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25 sm:w-44"
              />
            </div>
            {typeof customCoins === "number" &&
              customCoins > 0 &&
              customCoins < MIN_COINS && (
                <p className="text-xs text-red-500">
                  Minimum is {MIN_COINS} cookies.
                </p>
              )}
            {typeof customCoins === "number" && customCoins > MAX_COINS && (
              <p className="text-xs text-red-500">
                Maximum is {MAX_COINS.toLocaleString()} cookies.
              </p>
            )}
          </div>

          <div className="flex h-11 items-center gap-1.5">
            <span className="text-sm text-muted">Price:</span>
            <span className="text-lg font-semibold text-foreground">
              {customPriceCents != null
                ? `$${centsToAmountString(customPriceCents)}`
                : "—"}
            </span>
          </div>

          <div className="mt-0 flex w-full flex-col gap-2 sm:ml-auto sm:max-w-[220px]">
            <PayPalPayButton
              unavailable={!clientId}
              loading={Boolean(clientId) && !ready}
              disabled={paypalDisabled || validCustomCoins === null}
              onPay={() =>
                validCustomCoins &&
                buyWithPayPal({ customCoins: validCustomCoins }, "pack_custom")
              }
            />
            <StripePayButton
              unavailable={!stripeEnabled}
              loading={stripePendingId === "pack_custom"}
              disabled={stripeDisabled || validCustomCoins === null}
              onPay={() =>
                validCustomCoins &&
                buyWithStripe({ customCoins: validCustomCoins }, "pack_custom")
              }
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        {anyPaymentMethod
          ? "Secure payment via PayPal or Stripe. Prices in USD."
          : "Payments are temporarily unavailable."}
      </p>
    </>
  );
}
