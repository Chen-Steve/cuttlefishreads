function addOneCalendarDay(iso: string): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return d;
}

function tomorrowAtNoonLocal(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Picks tomorrow, or the day after the latest scheduled unlock when one exists. */
export function getSuggestedUnlockAt(
  latestChapterUnlockAt: string | null | undefined,
): Date {
  const suggested = latestChapterUnlockAt
    ? addOneCalendarDay(latestChapterUnlockAt)
    : tomorrowAtNoonLocal();

  const tomorrow = tomorrowAtNoonLocal();
  const now = Date.now();

  if (suggested.getTime() <= now) {
    return tomorrow.getTime() > now ? tomorrow : new Date(now + 60_000);
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
