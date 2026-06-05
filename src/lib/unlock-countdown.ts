export function isScheduledUnlock(unlockAt: string | null | undefined): boolean {
  if (!unlockAt) return false;
  return new Date(unlockAt).getTime() > Date.now();
}

export function getUnlockRemainingMs(unlockAt: string): number {
  return Math.max(0, new Date(unlockAt).getTime() - Date.now());
}

export function formatUnlockCountdown(remainingMs: number): string {
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
