"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatUnlockCountdown,
  getUnlockRemainingMs,
  isScheduledUnlock,
  type UnlockCountdownPrecision,
} from "@/lib/unlock-countdown";

export function useUnlockCountdown(
  unlockAt: string | null | undefined,
  onExpire?: () => void,
  precision: UnlockCountdownPrecision = "full",
) {
  const onExpireRef = useRef(onExpire);

  const scheduled = isScheduledUnlock(unlockAt);
  const [remainingMs, setRemainingMs] = useState(() =>
    unlockAt && scheduled ? getUnlockRemainingMs(unlockAt) : 0,
  );

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!unlockAt || !isScheduledUnlock(unlockAt)) return;

    const target = new Date(unlockAt).getTime();
    let expired = false;

    function tick() {
      const ms = Math.max(0, target - Date.now());
      setRemainingMs(ms);
      if (ms <= 0 && !expired) {
        expired = true;
        onExpireRef.current?.();
      }
    }

    tick();
    const tickMs = precision === "day-hour" ? 60_000 : 1_000;
    const id = window.setInterval(tick, tickMs);
    return () => window.clearInterval(id);
  }, [unlockAt, precision]);

  return {
    scheduled,
    remainingMs,
    label: scheduled ? formatUnlockCountdown(remainingMs, precision) : "",
  };
}
