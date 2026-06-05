"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatUnlockCountdown,
  getUnlockRemainingMs,
  isScheduledUnlock,
} from "@/lib/unlock-countdown";

export function useUnlockCountdown(
  unlockAt: string | null | undefined,
  onExpire?: () => void,
) {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const scheduled = isScheduledUnlock(unlockAt);
  const [remainingMs, setRemainingMs] = useState(() =>
    unlockAt && scheduled ? getUnlockRemainingMs(unlockAt) : 0,
  );

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
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [unlockAt]);

  return {
    scheduled,
    remainingMs,
    label: scheduled ? formatUnlockCountdown(remainingMs) : "",
  };
}
