/** JS `Date#getDay()` values. Sunday is 0. */
export const WEEKDAYS = [
  { value: 1, label: "Mon", long: "Monday" },
  { value: 2, label: "Tue", long: "Tuesday" },
  { value: 3, label: "Wed", long: "Wednesday" },
  { value: 4, label: "Thu", long: "Thursday" },
  { value: 5, label: "Fri", long: "Friday" },
  { value: 6, label: "Sat", long: "Saturday" },
  { value: 0, label: "Sun", long: "Sunday" },
] as const;

export const DEFAULT_RELEASE_WEEKDAYS = [1, 3, 5];

function uniqueSortedWeekdays(weekdays: Iterable<number>): number[] {
  return [...new Set(weekdays)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

function atSameTime(source: Date, onDay: Date): Date {
  const next = new Date(onDay);
  next.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  );
  return next;
}

/** Roll `startAt` forward to the first selected weekday, keeping the time of day. */
export function firstReleaseOnOrAfter(startAt: Date, weekdays: Iterable<number>): Date | null {
  const days = uniqueSortedWeekdays(weekdays);
  if (days.length === 0 || Number.isNaN(startAt.getTime())) return null;

  const cursor = new Date(startAt);
  for (let offset = 0; offset < 7; offset += 1) {
    if (days.includes(cursor.getDay())) return cursor;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

/**
 * Assign unlock datetimes in chapter order: `chaptersPerDay` chapters on each
 * selected weekday, then the next selected weekday, wrapping week to week.
 */
export function buildUnlockSchedule({
  startAt,
  weekdays,
  chaptersPerDay,
  count,
}: {
  startAt: Date;
  weekdays: Iterable<number>;
  chaptersPerDay: number;
  count: number;
}): Date[] {
  const days = uniqueSortedWeekdays(weekdays);
  const perDay = Math.max(1, Math.floor(chaptersPerDay) || 1);
  if (count <= 0 || days.length === 0 || Number.isNaN(startAt.getTime())) {
    return [];
  }

  const first = firstReleaseOnOrAfter(startAt, days);
  if (!first) return [];

  const dates: Date[] = [];
  const cursor = new Date(first);
  while (dates.length < count) {
    if (days.includes(cursor.getDay())) {
      const slot = atSameTime(startAt, cursor);
      for (let n = 0; n < perDay && dates.length < count; n += 1) {
        dates.push(new Date(slot));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function weekdayLabels(weekdays: Iterable<number>): string {
  const selected = new Set(uniqueSortedWeekdays(weekdays));
  return WEEKDAYS.filter((day) => selected.has(day.value))
    .map((day) => day.label)
    .join(", ");
}
