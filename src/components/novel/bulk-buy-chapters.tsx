"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Cookie, ShoppingBag, X } from "lucide-react";

import { bulkUnlockChapters } from "@/app/(main)/novels/actions";
import {
  BULK_BUY_DISCOUNT_RATE,
  BULK_BUY_MIN_ADVANCED_CHAPTERS,
  getBulkBuyState,
} from "@/lib/bulk-buy";
import { cookiesLabel } from "@/lib/utils";
import type { Chapter } from "@/types";

export function BulkBuyChapters({
  novelSlug,
  chapters,
  userCoins,
  isLoggedIn,
}: {
  novelSlug: string;
  chapters: Chapter[];
  userCoins: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showInsufficientPopup, setShowInsufficientPopup] = useState(false);
  const [pending, startTransition] = useTransition();
  const bulkBuy = getBulkBuyState(chapters);
  const canAfford = userCoins >= bulkBuy.discountedPrice;

  if (!bulkBuy.eligible || bulkBuy.purchasableCount === 0) return null;

  function handleBulkBuy() {
    setError(null);
    if (!canAfford) {
      setShowInsufficientPopup(true);
      return;
    }
    startTransition(async () => {
      const result = await bulkUnlockChapters(novelSlug);
      if (result.error) {
        if (result.error.toLowerCase().includes("insufficient coins")) {
          setShowInsufficientPopup(true);
          return;
        }
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const discountPercent = Math.round(BULK_BUY_DISCOUNT_RATE * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {!isLoggedIn ? (
            <Link
              href="/login"
              className="inline-flex h-8 mb-2 w-full items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-amber-400 sm:w-fit"
            >
              <ShoppingBag className="size-3.5" strokeWidth={1.75} aria-hidden />
              Sign in to buy all chapters ({discountPercent}% off)
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBulkBuy}
              disabled={pending}
              className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-400 sm:w-fit"
            >
              <ShoppingBag className="size-3.5" strokeWidth={1.75} aria-hidden />
              {pending
                ? "Unlocking…"
                : `Buy all ${bulkBuy.purchasableCount} chapters for ${bulkBuy.discountedPrice.toLocaleString()} cookies`}
              <span className="inline-flex items-center gap-1 font-normal text-amber-600/80 dark:text-amber-400/80">
                <Cookie className="size-3" strokeWidth={1.75} aria-hidden />
              </span>
            </button>
          )}


          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
            >
              {cookiesLabel(error)}
            </p>
          ) : null}
      </div>

      {showInsufficientPopup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setShowInsufficientPopup(false)}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-buy-insufficient-title"
            className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowInsufficientPopup(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted transition-colors hover:bg-background hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10">
              <Cookie className="size-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} aria-hidden />
            </div>
            <h3
              id="bulk-buy-insufficient-title"
              className="mt-4 text-center text-lg font-semibold text-foreground"
            >
              Insufficient cookies — top up!
            </h3>
            <p className="mt-2 text-center text-sm text-muted">
              You need{" "}
              <span className="font-semibold text-foreground">
                {bulkBuy.discountedPrice.toLocaleString()} cookies
              </span>{" "}
              but only have{" "}
              <span className="font-semibold text-foreground">
                {userCoins.toLocaleString()}
              </span>
              .
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Go to shop
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BulkBuyInfo() {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
      <p className="text-xs leading-relaxed text-muted">
        Bulk buy becomes available with at least{" "}
        {BULK_BUY_MIN_ADVANCED_CHAPTERS} advanced chapters.
      </p>
    </div>
  );
}
