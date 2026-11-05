"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { useUnlockCountdown } from "@/hooks/use-unlock-countdown";
import type { UnlockCountdownPrecision } from "@/lib/unlock-countdown";
import { cn } from "@/lib/utils";

export function UnlockCountdown({
  unlockAt,
  precision = "full",
  className,
}: {
  unlockAt: string;
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
