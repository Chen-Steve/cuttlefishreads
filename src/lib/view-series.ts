export type ViewsRange = "day" | "week" | "month" | "year";

export type ViewSeriesPoint = {
  /** Bucket start as ISO date (YYYY-MM-DD). */
  key: string;
  label: string;
  count: number;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function utcDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcWeek(d: Date): Date {
  // Monday-start weeks in UTC.
  const day = d.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addUtcDays(utcDate(d), offset);
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfUtcYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

/** Inclusive list of UTC calendar days from start → end. */
function eachUtcDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let cur = utcDate(start); cur <= end; cur = addUtcDays(cur, 1)) {
    days.push(new Date(cur));
  }
  return days;
}

function labelForRange(range: ViewsRange, bucketStart: Date): string {
  if (range === "day") {
    return `${MONTH_NAMES[bucketStart.getUTCMonth()]} ${bucketStart.getUTCDate()}`;
  }
  if (range === "week") {
    return `${MONTH_NAMES[bucketStart.getUTCMonth()]} ${bucketStart.getUTCDate()}`;
  }
  if (range === "month") {
    return `${MONTH_NAMES[bucketStart.getUTCMonth()]} '${String(
      bucketStart.getUTCFullYear(),
    ).slice(2)}`;
  }
  return String(bucketStart.getUTCFullYear());
}

/**
 * Build a filled time series from daily rollup rows.
 * Missing buckets are zero-filled so the chart stays continuous.
 */
export function buildViewSeries(
  dailyRows: { day: string; view_count: number }[],
  range: ViewsRange,
  now = new Date(),
): ViewSeriesPoint[] {
  const today = utcDate(now);
  const byDay = new Map<string, number>();
  for (const row of dailyRows) {
    const key = row.day.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(row.view_count ?? 0));
  }

  let bucketStarts: Date[] = [];

  if (range === "day") {
    const start = addUtcDays(today, -29);
    bucketStarts = eachUtcDay(start, today);
  } else if (range === "week") {
    const thisWeek = startOfUtcWeek(today);
    for (let i = 11; i >= 0; i -= 1) {
      bucketStarts.push(addUtcDays(thisWeek, -7 * i));
    }
  } else if (range === "month") {
    const thisMonth = startOfUtcMonth(today);
    for (let i = 11; i >= 0; i -= 1) {
      bucketStarts.push(
        new Date(
          Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - i, 1),
        ),
      );
    }
  } else {
    const thisYear = startOfUtcYear(today);
    // Show up to 5 years ending with the current year.
    for (let i = 4; i >= 0; i -= 1) {
      bucketStarts.push(
        new Date(Date.UTC(thisYear.getUTCFullYear() - i, 0, 1)),
      );
    }
  }

  return bucketStarts.map((start) => {
    let endExclusive: Date;
    if (range === "day") {
      endExclusive = addUtcDays(start, 1);
    } else if (range === "week") {
      endExclusive = addUtcDays(start, 7);
    } else if (range === "month") {
      endExclusive = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
      );
    } else {
      endExclusive = new Date(Date.UTC(start.getUTCFullYear() + 1, 0, 1));
    }

    let count = 0;
    for (let cur = start; cur < endExclusive; cur = addUtcDays(cur, 1)) {
      count += byDay.get(formatISODate(cur)) ?? 0;
    }

    return {
      key: formatISODate(start),
      label: labelForRange(range, start),
      count,
    };
  });
}

export function parseViewsRange(value?: string): ViewsRange {
  if (value === "week" || value === "month" || value === "year") return value;
  return "day";
}
