"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, ShoppingBag } from "lucide-react";

import { bulkUnlockChapters } from "@/app/(main)/novels/actions";
import {
  BULK_BUY_DISCOUNT_RATE,
  BULK_BUY_MIN_ADVANCED_CHAPTERS,
  getBulkBuyState,
} from "@/lib/bulk-buy";
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
  const [pending, startTransition] = useTransition();
  const bulkBuy = getBulkBuyState(chapters);

  if (!bulkBuy.eligible) return null;

  function handleBulkBuy() {
    setError(null);
    startTransition(async () => {
      const result = await bulkUnlockChapters(novelSlug);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const discountPercent = Math.round(BULK_BUY_DISCOUNT_RATE * 100);

  return (
    <div className="flex flex-col gap-3">
      {bulkBuy.purchasableCount === 0 ? (
        <p className="text-sm text-muted">
          You have unlocked all advanced chapters for this novel.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {!isLoggedIn ? (
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-fit"
            >
              <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
              Sign in to buy all chapters ({discountPercent}% off)
            </Link>
          ) : userCoins >= bulkBuy.discountedPrice ? (
            <button
              type="button"
              onClick={handleBulkBuy}
              disabled={pending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            >
              <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
              {pending
                ? "Unlocking…"
                : `Buy all ${bulkBuy.purchasableCount} chapters for ${bulkBuy.discountedPrice.toLocaleString()} coins`}
              <span className="inline-flex items-center gap-1 font-normal text-amber-600/80">
                <Coins className="size-3.5" strokeWidth={1.75} aria-hidden />
              </span>
            </button>
          ) : (
            <Link
              href="/shop"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-fit"
            >
              <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
              Buy coins to unlock all ({bulkBuy.discountedPrice.toLocaleString()}{" "}
              coins)
            </Link>
          )}

          <p className="text-xs text-muted">
            {discountPercent}% off the regular price of{" "}
            <span className="line-through">
              {bulkBuy.fullPrice.toLocaleString()} coins
            </span>
            .
          </p>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}

    </div>
  );
}

export function BulkBuyInfo({
  advancedCount,
}: {
  advancedCount: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
      <p className="text-xs leading-relaxed text-muted">
        Bulk buy becomes available once a novel has at least{" "}
        {BULK_BUY_MIN_ADVANCED_CHAPTERS} advanced chapters. This novel currently
        has {advancedCount}. Advanced chapters are  releases set by the
        translator so NU can better pick up the story.
      </p>
    </div>
  );
}
