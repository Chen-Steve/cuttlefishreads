"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cookie } from "lucide-react";

import { unlockChapter } from "@/app/(main)/novels/actions";
import { useUnlockCountdown } from "@/hooks/use-unlock-countdown";
import { isScheduledUnlock } from "@/lib/unlock-countdown";
import { loginHref, shopHref } from "@/lib/safe-return-path";
import { cookiesLabel } from "@/lib/utils";

const btnClass =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";

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
  const pathname = usePathname();
  const returnPath = pathname || `/novels/${novelSlug}/${chapterNumber}`;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const scheduled = isScheduledUnlock(unlockAt);
  const canUnlockEarly = scheduled && coinCost > 0;
  const canPurchase = !scheduled || canUnlockEarly;
  const canAfford = userCoins >= coinCost;
  const { label: countdownLabel } = useUnlockCountdown(unlockAt, () =>
    router.refresh(),
  );

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
    <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:px-6">
      {scheduled && countdownLabel ? (
        <p className="text-sm font-semibold text-foreground">
          Read in{" "}
          <span className="tabular-nums" suppressHydrationWarning>
            {countdownLabel}
          </span>
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 text-sm text-red-600 dark:text-red-400"
        >
          {cookiesLabel(error)}
        </p>
      ) : null}

      {canPurchase ? (
        <div
          className={`flex flex-col items-center gap-2 ${scheduled && countdownLabel ? "mt-5" : ""}`}
        >
          {!isLoggedIn ? (
            <Link href={loginHref(returnPath)} className={btnClass}>
              Sign in to unlock
            </Link>
          ) : canAfford ? (
            <button
              type="button"
              onClick={handleUnlock}
              disabled={pending}
              className={btnClass}
            >
              {pending ? (
                "Unlocking…"
              ) : (
                <>
                  Unlock for {coinCost}
                  <Cookie className="size-3.5" strokeWidth={1.75} aria-hidden />
                </>
              )}
            </button>
          ) : (
            <Link href={shopHref(returnPath)} className={btnClass}>
              Buy cookies
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
