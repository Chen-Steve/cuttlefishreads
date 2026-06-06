"use client";

import { Coins, Lock } from "lucide-react";

import { UnlockCountdown } from "@/components/reader/unlock-countdown";
import { isScheduledUnlock } from "@/lib/unlock-countdown";
import type { Chapter } from "@/types";

export function ChapterLockBadge({ chapter }: { chapter: Chapter }) {
  if (!chapter.locked) return null;

  if (chapter.unlockAt && isScheduledUnlock(chapter.unlockAt)) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        {chapter.coinCost > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
            {chapter.coinCost}
            <Coins className="size-3" strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
        <UnlockCountdown unlockAt={chapter.unlockAt} />
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Lock className="size-3" strokeWidth={2} aria-hidden />
      {chapter.coinCost}
      <Coins className="size-3" strokeWidth={1.75} aria-hidden />
    </span>
  );
}
