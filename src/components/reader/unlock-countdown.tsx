"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { useUnlockCountdown } from "@/hooks/use-unlock-countdown";
import type { UnlockCountdownPrecision } from "@/lib/unlock-countdown";
import { cn } from "@/lib/utils";

export function UnlockCountdown({
  unlockAt,
  variant = "badge",
  precision = "full",
  className,
}: {
  unlockAt: string;
  variant?: "badge" | "prominent";
  precision?: UnlockCountdownPrecision;
  className?: string;
}) {
  const router = useRouter();
  const { scheduled, label } = useUnlockCountdown(
    unlockAt,
    () => router.refresh(),
    precision,
  );

  if (!scheduled) return null;

  if (variant === "prominent") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3",
          className,
        )}
      >
        <Clock className="size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
        <div>
          <p className="text-xs font-medium text-accent/70">Unlocks in</p>
          <p className="font-mono text-lg font-semibold leading-tight tabular-nums text-accent" suppressHydrationWarning>
            {label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium tabular-nums text-accent",
        className,
      )}
    >
      <Clock className="size-3" strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}
