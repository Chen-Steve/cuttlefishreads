"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cookie, Lock } from "lucide-react";

import { unlockChapter } from "@/app/(main)/novels/actions";
import { UnlockCountdown } from "@/components/reader/unlock-countdown";
import { isScheduledUnlock } from "@/lib/unlock-countdown";
import { cookiesLabel } from "@/lib/utils";

const btnClass =
  "inline-flex h-11 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover";

function CoinCost({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
      {amount}
      <Cookie className="size-3.5" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function ChapterUnlockGate({
  novelSlug,
  chapterNumber,
  coinCost,
  unlockAt,
  userCoins,
  isLoggedIn,
}: {
  novelSlug: string;
  chapterNumber: number;
  coinCost: number;
  unlockAt: string | null;
  userCoins: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const scheduled = isScheduledUnlock(unlockAt);
  const canUnlockEarly = scheduled && coinCost > 0;
  const canAfford = userCoins >= coinCost;

  function handleUnlock() {
    setError(null);
    startTransition(async () => {
      const result = await unlockChapter(novelSlug, chapterNumber);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10">
        <Lock className="size-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        This chapter is locked
      </h2>

      {scheduled && unlockAt ? (
        <>
          <div className="mt-4 flex justify-center">
            <UnlockCountdown unlockAt={unlockAt} variant="prominent" />
          </div>
          <p className="mt-4 text-sm text-muted">
            {canUnlockEarly ? (
              <>
                Or unlock early with <CoinCost amount={coinCost} /> cookies.
              </>
            ) : (
              "Unlocks automatically when the timer reaches zero."
            )}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Unlock with <CoinCost amount={coinCost} /> cookies to continue reading.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          {cookiesLabel(error)}
        </p>
      )}

      {(!scheduled || canUnlockEarly) && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {!isLoggedIn ? (
            <Link href="/login" className={btnClass}>
              Sign in to unlock
            </Link>
          ) : (
            <>
              <p className="text-xs text-muted">
                Balance:{" "}
                <span className="font-semibold text-foreground">
                  {userCoins.toLocaleString()} cookies
                </span>
              </p>
              {canAfford ? (
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={pending}
                  className={`${btnClass} gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {pending
                    ? "Unlocking…"
                    : `Unlock${canUnlockEarly ? " early" : ""} for ${coinCost} cookies`}
                </button>
              ) : (
                <Link href="/shop" className={btnClass}>
                  Buy cookies
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
