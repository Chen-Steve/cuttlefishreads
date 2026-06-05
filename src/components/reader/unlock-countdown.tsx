"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { useUnlockCountdown } from "@/hooks/use-unlock-countdown";
import { cn } from "@/lib/utils";

export function UnlockCountdown({
  unlockAt,
  variant = "badge",
  className,
}: {
  unlockAt: string;
  variant?: "badge" | "prominent";
  className?: string;
}) {
  const router = useRouter();
  const { scheduled, label } = useUnlockCountdown(unlockAt, () => {
    router.refresh();
  });

  if (!scheduled) return null;

  if (variant === "prominent") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3",
          className,
        )}
      >
        <Clock className="size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
        <div className="text-left">
          <p className="text-xs font-medium text-muted">Free unlock in</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-accent">
            {label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
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
