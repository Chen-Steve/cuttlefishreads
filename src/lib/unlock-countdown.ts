export function isScheduledUnlock(unlockAt: string | null | undefined): boolean {
  if (!unlockAt) return false;
  return new Date(unlockAt).getTime() > Date.now();
}

export function getUnlockRemainingMs(unlockAt: string): number {
  return Math.max(0, new Date(unlockAt).getTime() - Date.now());
}

export type UnlockCountdownPrecision = "full" | "day-hour";

export function formatUnlockCountdown(
  remainingMs: number,
  precision: UnlockCountdownPrecision = "full",
): string {
  if (precision === "day-hour") {
    const days = Math.floor(remainingMs / 86_400_000);
    const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return "0h";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
