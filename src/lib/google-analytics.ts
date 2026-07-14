import "server-only";

import { unstable_cache } from "next/cache";
import {
  BetaAnalyticsDataClient,
  protos,
} from "@google-analytics/data";

type FilterExpression =
  protos.google.analytics.data.v1beta.IFilterExpression;

// First month with any site traffic; monthly reports start here.
const LAUNCH_DATE = "2026-06-01";

/** How long public novel page view counts stay cached (1 hour). */
const NOVEL_VIEW_COUNT_REVALIDATE_SECONDS = 60 * 60;

export type ViewsMode = "daily" | "monthly" | "all";

export type DailyViewsPoint = {
  /** "YYYY-MM-DD" */
  date: string;
  bySlug: Record<string, number>;
};

export type MonthlyViewsPoint = {
  /** "YYYY-MM" */
  month: string;
  bySlug: Record<string, number>;
};

export type GoogleAnalyticsDashboard = {
  configured: boolean;
  error: boolean;
  /** Per-day, per-novel views for the current calendar month. */
  dailyViews: DailyViewsPoint[];
  /** Per-month, per-novel views since launch. */
  monthlyViews: MonthlyViewsPoint[];
};

const EMPTY_ANALYTICS: GoogleAnalyticsDashboard = {
  configured: false,
  error: false,
  dailyViews: [],
  monthlyViews: [],
};

function getConfiguration() {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.trim();
  const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  ).trim();

  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function novelPathFilter(slugs: string[]): FilterExpression {
  // Longest-first so "cool" does not steal paths belonging to "cooler".
  const alternatives = [...slugs]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  return {
    filter: {
      fieldName: "pagePath",
      stringFilter: {
        matchType:
          protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType
            .FULL_REGEXP,
        // Novel detail page + numeric chapter pages only
        // e.g. /novels/my-novel and /novels/my-novel/12
        value: `^/novels/(${alternatives})(/\\d+)?/?$`,
        caseSensitive: true,
      },
    },
  };
}

function metricValue(
  row: protos.google.analytics.data.v1beta.IRow | null | undefined,
  index: number,
): number {
  return Number(row?.metricValues?.[index]?.value ?? 0);
}

/** Maps a pagePath like "/novels/my-novel/12" back to its novel slug. */
function slugForPath(path: string, slugsByLength: string[]): string | null {
  const normalized = path.replace(/\/+$/, "") || "/";
  return (
    slugsByLength.find((slug) => {
      if (normalized === `/novels/${slug}`) return true;
      return new RegExp(`^/novels/${escapeRegex(slug)}/\\d+$`).test(normalized);
    }) ?? null
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function getGoogleAnalyticsDashboard(
  slugs: string[],
  mode: ViewsMode = "daily",
): Promise<GoogleAnalyticsDashboard> {
  const config = getConfiguration();
  if (!config) return EMPTY_ANALYTICS;

  if (slugs.length === 0) {
    return { ...EMPTY_ANALYTICS, configured: true };
  }

  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
  });

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const property = `properties/${config.propertyId}`;
  const dimensionFilter = novelPathFilter(slugs);
  const metrics = [{ name: "screenPageViews" }];

  try {
    // Only run the report the selected view needs: daily for "This month";
    // monthly covers both the "By month" bars and the all-time pie.
    const [dailyResult, monthlyResult] = await Promise.all([
      mode === "daily"
        ? client.runReport({
            property,
            dimensionFilter,
            metrics,
            dimensions: [{ name: "date" }, { name: "pagePath" }],
            dateRanges: [{ startDate: monthStart, endDate: "today" }],
            limit: 100_000,
          })
        : null,
      mode !== "daily"
        ? client.runReport({
            property,
            dimensionFilter,
            metrics,
            dimensions: [{ name: "yearMonth" }, { name: "pagePath" }],
            dateRanges: [{ startDate: LAUNCH_DATE, endDate: "today" }],
            limit: 100_000,
          })
        : null,
    ]);
    const daily = dailyResult?.[0] ?? null;
    const monthly = monthlyResult?.[0] ?? null;

    const slugsByLength = [...slugs].sort((a, b) => b.length - a.length);

    // Daily views for the current month, keyed "YYYY-MM-DD" (GA returns YYYYMMDD).
    const dailyViews: DailyViewsPoint[] = [];
    if (daily) {
      const dailyBuckets = new Map<string, Record<string, number>>();
      for (const row of daily.rows ?? []) {
        const raw = row.dimensionValues?.[0]?.value ?? "";
        const slug = slugForPath(
          row.dimensionValues?.[1]?.value ?? "",
          slugsByLength,
        );
        if (raw.length !== 8 || !slug) continue;
        const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
        const bucket = dailyBuckets.get(date) ?? {};
        bucket[slug] = (bucket[slug] ?? 0) + metricValue(row, 0);
        dailyBuckets.set(date, bucket);
      }
      // Fill every day of the month up to today so gaps show as zero.
      for (let d = 1; d <= now.getDate(); d++) {
        const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(d)}`;
        dailyViews.push({ date, bySlug: dailyBuckets.get(date) ?? {} });
      }
    }

    // Monthly views since launch, keyed "YYYY-MM" (GA returns YYYYMM).
    const monthlyViews: MonthlyViewsPoint[] = [];
    if (monthly) {
      const monthlyBuckets = new Map<string, Record<string, number>>();
      for (const row of monthly.rows ?? []) {
        const raw = row.dimensionValues?.[0]?.value ?? "";
        const slug = slugForPath(
          row.dimensionValues?.[1]?.value ?? "",
          slugsByLength,
        );
        if (raw.length !== 6 || !slug) continue;
        const month = `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
        const bucket = monthlyBuckets.get(month) ?? {};
        bucket[slug] = (bucket[slug] ?? 0) + metricValue(row, 0);
        monthlyBuckets.set(month, bucket);
      }
      // Fill every month from launch to now.
      const cursor = new Date(`${LAUNCH_DATE}T00:00:00`);
      while (
        cursor.getFullYear() < now.getFullYear() ||
        (cursor.getFullYear() === now.getFullYear() &&
          cursor.getMonth() <= now.getMonth())
      ) {
        const month = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
        monthlyViews.push({ month, bySlug: monthlyBuckets.get(month) ?? {} });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    return {
      configured: true,
      error: false,
      dailyViews,
      monthlyViews,
    };
  } catch (error) {
    console.error("[google-analytics] Unable to load dashboard data:", error);
    return { ...EMPTY_ANALYTICS, configured: true, error: true };
  } finally {
    await client.close();
  }
}

/**
 * All-time novel detail + chapter page views, keyed by slug, in ONE GA
 * request (GA4 caps concurrent Data API requests, so never fan out per slug).
 * Throws on failure so errors are never cached as zero counts.
 */
async function fetchAllTimeViewsBySlug(
  slugs: string[],
): Promise<Record<string, number>> {
  const config = getConfiguration();
  if (!config || slugs.length === 0) return {};

  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
  });

  try {
    const [report] = await client.runReport({
      property: `properties/${config.propertyId}`,
      dimensionFilter: novelPathFilter(slugs),
      metrics: [{ name: "screenPageViews" }],
      dimensions: [{ name: "pagePath" }],
      dateRanges: [{ startDate: LAUNCH_DATE, endDate: "today" }],
      limit: 100_000,
    });

    const slugsByLength = [...slugs].sort((a, b) => b.length - a.length);
    const totals: Record<string, number> = {};
    for (const slug of slugs) totals[slug] = 0;
    for (const row of report.rows ?? []) {
      const slug = slugForPath(
        row.dimensionValues?.[0]?.value ?? "",
        slugsByLength,
      );
      if (!slug) continue;
      totals[slug] = (totals[slug] ?? 0) + metricValue(row, 0);
    }
    return totals;
  } finally {
    await client.close();
  }
}

/**
 * All-time views for many novels — single batched GA request, cached for an
 * hour per slug set. Both the admin dashboard and public novel pages resolve
 * through this, so they always run the identical GA query.
 */
export async function getAllTimeViewsBySlug(
  slugs: string[],
): Promise<Record<string, number>> {
  if (!getConfiguration() || slugs.length === 0) return {};

  const unique = [...new Set(slugs.filter(Boolean))].sort();

  try {
    return await unstable_cache(
      () => fetchAllTimeViewsBySlug(unique),
      // Bump the version whenever the query shape changes to bust stale counts.
      ["ga4-all-time-views-v5", unique.join("|")],
      {
        revalidate: NOVEL_VIEW_COUNT_REVALIDATE_SECONDS,
        tags: unique.map((slug) => `ga4-novel-views:${slug}`),
      },
    )();
  } catch (error) {
    console.error(
      "[google-analytics] Unable to load all-time views by slug:",
      error,
    );
    return {};
  }
}

/**
 * All-time novel detail + chapter page views for a single novel
 * (GA4 screenPageViews for `/novels/{slug}` and `/novels/{slug}/{n}`).
 */
export async function getNovelPageViews(slug: string): Promise<number> {
  if (!slug) return 0;
  const totals = await getAllTimeViewsBySlug([slug]);
  return totals[slug] ?? 0;
}
