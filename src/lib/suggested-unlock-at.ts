const DAY_MS = 86_400_000;

function tomorrowAtMidnightLocal(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Picks the day after the latest scheduled unlock, keeping the same time of
 * day so a release schedule stays consistent (e.g. always 12:00 AM). If that
 * lands in the past, the date rolls forward — still at the same time — until
 * it's in the future. Without a previous unlock, defaults to tomorrow at
 * 12:00 AM local time.
 */
export function getSuggestedUnlockAt(
  latestChapterUnlockAt: string | null | undefined,
): Date {
  if (!latestChapterUnlockAt) return tomorrowAtMidnightLocal();

  const suggested = new Date(latestChapterUnlockAt);
  if (Number.isNaN(suggested.getTime())) return tomorrowAtMidnightLocal();

  suggested.setDate(suggested.getDate() + 1);

  const now = Date.now();
  if (suggested.getTime() <= now) {
    const daysBehind = Math.ceil((now - suggested.getTime()) / DAY_MS);
    suggested.setDate(suggested.getDate() + daysBehind);
    // A DST shift can leave the jump one day short.
    if (suggested.getTime() <= now) {
      suggested.setDate(suggested.getDate() + 1);
    }
  }

  return suggested;
}

export function formatSuggestedUnlockPreview(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
