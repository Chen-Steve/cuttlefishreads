import type { Metadata } from "next";
import { Bookmark, Cookie, Eye, ShoppingCart } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  getMonthlyViews,
  getDailyViews,
  type MonthlyViewPoint,
  type DailyViewPoint,
} from "@/lib/data";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type NovelStat = {
  id: string;
  slug: string;
  title: string;
  views: number;
  bookmarks: number;
  purchases: number;
  coinsEarned: number;
};

function tally<T extends string>(rows: { key: T }[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const row of rows) {
    map.set(row.key, (map.get(row.key) ?? 0) + 1);
  }
  return map;
}

// Translator balances can be fractional (exact 70% split). Keep one decimal
// place and drop a trailing ".0".
function formatCoins(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isDaily = view === "daily";
  const access = await getAdminAccess();
  const admin = createAdminClient();

  let novelsQuery = admin
    .from("novels")
    .select("id, slug, title")
    .order("updated_at", { ascending: false });

  if (access && !access.isMasterAdmin) {
    novelsQuery = novelsQuery.eq("publisher_id", access.userId);
  }

  const { data: novels } = await novelsQuery.returns<
    { id: string; slug: string; title: string }[]
  >();

  const rows = novels ?? [];
  const novelIds = rows.map((n) => n.id);
  const slugs = rows.map((n) => n.slug);

  // Aggregate in bulk. Each table is keyed differently: views/bookmarks by
  // novel_id, chapter_unlocks by novel_slug.
  const [viewsRes, bookmarksRes, unlocksRes, monthlyViews, dailyViews] =
    novelIds.length === 0
      ? [
          { data: [] },
          { data: [] },
          { data: [] },
          [] as MonthlyViewPoint[],
          [] as DailyViewPoint[],
        ]
      : await Promise.all([
          admin.from("novel_views").select("novel_id").in("novel_id", novelIds),
          admin.from("bookmarks").select("novel_id").in("novel_id", novelIds),
          admin
            .from("chapter_unlocks")
            .select(
              "novel_slug, chapter_number, translator_share, created_at, user_id",
            )
            .in("novel_slug", slugs)
            .order("created_at", { ascending: false }),
          getMonthlyViews(novelIds),
          getDailyViews(novelIds),
        ]);

  const viewsByNovel = tally(
    ((viewsRes.data ?? []) as { novel_id: string }[]).map((r) => ({
      key: r.novel_id,
    })),
  );
  const bookmarksByNovel = tally(
    ((bookmarksRes.data ?? []) as { novel_id: string }[]).map((r) => ({
      key: r.novel_id,
    })),
  );

  const unlockRows = (unlocksRes.data ?? []) as {
    novel_slug: string;
    chapter_number: number;
    translator_share: number;
    created_at: string;
    user_id: string;
  }[];

  const purchasesBySlug = new Map<string, number>();
  const earnedBySlug = new Map<string, number>();
  for (const row of unlockRows) {
    purchasesBySlug.set(
      row.novel_slug,
      (purchasesBySlug.get(row.novel_slug) ?? 0) + 1,
    );
    earnedBySlug.set(
      row.novel_slug,
      (earnedBySlug.get(row.novel_slug) ?? 0) + row.translator_share,
    );
  }

  // Resolve buyer usernames for the individual-purchase list.
  const buyerIds = [...new Set(unlockRows.map((r) => r.user_id))];
  const usernameById = new Map<string, string>();
  if (buyerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", buyerIds);
    for (const p of (profiles ?? []) as { id: string; username: string | null }[]) {
      usernameById.set(p.id, p.username ?? "Unknown");
    }
  }

  // Group individual purchases by novel, newest first (unlockRows is already
  // ordered by created_at desc). Each row carries the exact translator share
  // that was credited at purchase time.
  type Purchase = {
    chapterNumber: number;
    buyer: string;
    earned: number;
    createdAt: string;
  };
  const purchasesByNovel = new Map<string, Purchase[]>();
  for (const row of unlockRows) {
    const list = purchasesByNovel.get(row.novel_slug) ?? [];
    list.push({
      chapterNumber: row.chapter_number,
      buyer: usernameById.get(row.user_id) ?? "Unknown",
      earned: row.translator_share,
      createdAt: row.created_at,
    });
    purchasesByNovel.set(row.novel_slug, list);
  }
  const novelsWithPurchases = rows.filter((n) =>
    purchasesByNovel.has(n.slug),
  );

  // Earnings are the exact translator share credited per unlock (70% of list;
  // the platform absorbs any bulk discount).
  const stats: NovelStat[] = rows.map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    views: viewsByNovel.get(n.id) ?? 0,
    bookmarks: bookmarksByNovel.get(n.id) ?? 0,
    purchases: purchasesBySlug.get(n.slug) ?? 0,
    coinsEarned: earnedBySlug.get(n.slug) ?? 0,
  }));

  const totals = stats.reduce(
    (acc, s) => ({
      views: acc.views + s.views,
      bookmarks: acc.bookmarks + s.bookmarks,
      purchases: acc.purchases + s.purchases,
      coinsEarned: acc.coinsEarned + s.coinsEarned,
    }),
    { views: 0, bookmarks: 0, purchases: 0, coinsEarned: 0 },
  );

  return (
    <PageContainer as="div">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Dashboard
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Views, bookmarks, and chapter purchases across your novels.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={<Eye className="size-4" />} label="Total views" value={totals.views} />
        <SummaryCard icon={<Bookmark className="size-4" />} label="Bookmarks" value={totals.bookmarks} />
        <SummaryCard icon={<ShoppingCart className="size-4" />} label="Purchases" value={totals.purchases} />
        <SummaryCard icon={<Cookie className="size-4" />} label="Cookies earned" value={totals.coinsEarned} />
      </div>

      {isDaily ? (
        <DailyViewsChart
          data={dailyViews as DailyViewPoint[]}
          novels={rows}
        />
      ) : (
        <MonthlyViewsChart
          data={monthlyViews as MonthlyViewPoint[]}
          novels={rows}
        />
      )}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
        {stats.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">
            No novels yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Novel</th>
                <th className="px-4 py-3 text-right font-medium">Views</th>
                <th className="px-4 py-3 text-right font-medium">Bookmarks</th>
                <th className="px-4 py-3 text-right font-medium">Purchases</th>
                <th className="px-4 py-3 text-right font-medium">Cookies</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {s.title}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {s.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {s.bookmarks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {s.purchases.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-600">
                    {formatCoins(s.coinsEarned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Chapter purchases
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Individual chapter unlocks per novel, with your 70% earnings.
        </p>

        {novelsWithPurchases.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
            No chapter purchases yet.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {novelsWithPurchases.map((n) => {
              const purchases = purchasesByNovel.get(n.slug) ?? [];
              const earned = purchases.reduce((sum, p) => sum + p.earned, 0);
              return (
                <div
                  key={n.id}
                  className="overflow-x-auto rounded-2xl border border-border bg-surface"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                    <h3 className="font-medium text-foreground">{n.title}</h3>
                    <span className="text-xs text-muted">
                      {purchases.length.toLocaleString()} purchase
                      {purchases.length === 1 ? "" : "s"} ·{" "}
                      <span className="font-semibold text-amber-600">
                        {formatCoins(earned)} cookies
                      </span>
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="px-4 py-3 font-medium">Reader</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Chapter
                        </th>
                        <th className="px-4 py-3 text-right font-medium">Date</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Earned
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p, i) => (
                        <tr
                          key={`${n.slug}-${p.chapterNumber}-${i}`}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 text-foreground">
                            {p.buyer}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            Ch. {p.chapterNumber}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-600">
                            {formatCoins(p.earned)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
        {formatCoins(value)}
      </p>
    </div>
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const NOVEL_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#a855f7", "#14b8a6", "#f97316", "#ec4899", "#84cc16",
];

// SVG chart constants
const PT = 12;   // padding top
const PR = 10;   // padding right
const PB = 26;   // padding bottom (x-axis labels)
const PL = 46;   // padding left (y-axis labels)
const PLOT_H = 160;
const REF_W = 680;
const SVG_H = PT + PLOT_H + PB;

function niceMax(v: number): number {
  if (v <= 0) return 5;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

function fmtTick(v: number): string {
  if (v === 0) return "0";
  if (v >= 1_000_000) {
    const n = v / 1_000_000;
    return `${n % 1 === 0 ? n : n.toFixed(1)}M`;
  }
  if (v >= 1_000) {
    const n = v / 1_000;
    return `${n % 1 === 0 ? n : n.toFixed(1)}K`;
  }
  return String(v);
}

type ChartBar = {
  key: string;
  xLabel: string;
  showLabel: boolean;
  total: number;
  segments: { id: string; count: number }[];
};

function SvgBarChart({
  bars,
  colorById,
  highlightLast = false,
}: {
  bars: ChartBar[];
  colorById: Map<string, string>;
  highlightLast?: boolean;
}) {
  const rawMax = Math.max(...bars.map((b) => b.total), 1);
  const maxY = niceMax(rawMax);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxY));

  const plotW = REF_W - PL - PR;
  const slot = plotW / Math.max(bars.length, 1);
  const barW = Math.max(slot * 0.65, 2);
  const barOffset = (slot - barW) / 2;
  const plotBottom = PT + PLOT_H;

  return (
    <svg
      viewBox={`0 0 ${REF_W} ${SVG_H}`}
      className="w-full"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {/* Gridlines + Y-axis labels */}
      {ticks.map((tick) => {
        const y = PT + PLOT_H - (tick / maxY) * PLOT_H;
        return (
          <g key={tick}>
            <line
              x1={PL}
              y1={y}
              x2={REF_W - PR}
              y2={y}
              stroke="currentColor"
              strokeOpacity={tick === 0 ? 0.2 : 0.08}
              strokeWidth="1"
            />
            <text
              x={PL - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.45"
              fontFamily="inherit"
            >
              {fmtTick(tick)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {bars.map(({ key, xLabel, showLabel, total, segments }, i) => {
        const x = PL + i * slot + barOffset;
        const isHighlighted = highlightLast && i === bars.length - 1;
        let currentY = plotBottom;

        return (
          <g key={key} opacity={isHighlighted || !highlightLast ? 1 : 0.6}>
            <title>{xLabel}: {total} new readers</title>
            {segments.map((seg) => {
              const segH = Math.max((seg.count / maxY) * PLOT_H, 0);
              const rectY = currentY - segH;
              currentY -= segH;
              return (
                <rect
                  key={seg.id}
                  x={x}
                  y={rectY}
                  width={barW}
                  height={segH}
                  fill={colorById.get(seg.id) ?? "#6366f1"}
                  rx="2"
                />
              );
            })}
            {/* Zero-height placeholder so empty bars still get a tick mark */}
            {total === 0 && (
              <rect x={x} y={plotBottom - 1} width={barW} height={1} fill="currentColor" fillOpacity="0.1" />
            )}
            {showLabel && (
              <text
                x={x + barW / 2}
                y={plotBottom + 16}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                fillOpacity="0.5"
                fontFamily="inherit"
              >
                {xLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ChartLegend({
  novels,
  colorById,
}: {
  novels: { id: string; title: string }[];
  colorById: Map<string, string>;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {novels.map((n) => (
        <div key={n.id} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 shrink-0 rounded-[3px]"
            style={{ background: colorById.get(n.id) }}
          />
          <span className="text-xs text-muted">{n.title}</span>
        </div>
      ))}
    </div>
  );
}

function ViewToggle({ active }: { active: "monthly" | "daily" }) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-medium">
      <a
        href="/admin/dashboard"
        className={`rounded-md px-3 py-1.5 transition-colors ${
          active === "monthly"
            ? "bg-foreground text-background"
            : "text-muted hover:text-foreground"
        }`}
      >
        Monthly
      </a>
      <a
        href="/admin/dashboard?view=daily"
        className={`rounded-md px-3 py-1.5 transition-colors ${
          active === "daily"
            ? "bg-foreground text-background"
            : "text-muted hover:text-foreground"
        }`}
      >
        This month
      </a>
    </div>
  );
}

function MonthlyViewsChart({
  data,
  novels,
}: {
  data: MonthlyViewPoint[];
  novels: { id: string; title: string }[];
}) {
  const colorById = new Map(
    novels.map((n, i) => [n.id, NOVEL_COLORS[i % NOVEL_COLORS.length]]),
  );
  const totals = data.map((d) =>
    Object.values(d.byNovel).reduce((s, c) => s + c, 0),
  );
  const grandTotal = totals.reduce((s, c) => s + c, 0);
  const currentMonthTotal = totals[totals.length - 1] ?? 0;
  const activeNovels = novels.filter((n) =>
    data.some((d) => (d.byNovel[n.id] ?? 0) > 0),
  );

  const bars: ChartBar[] = data.map(({ month, byNovel }, i) => {
    const [year, m] = month.split("-");
    const label = `${MONTH_NAMES[parseInt(m, 10) - 1]} '${year.slice(2)}`;
    return {
      key: month,
      xLabel: label,
      showLabel: true,
      total: totals[i],
      segments: novels
        .map((n) => ({ id: n.id, count: byNovel[n.id] ?? 0 }))
        .filter((s) => s.count > 0),
    };
  });

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">New readers by month</h2>
          <p className="mt-0.5 text-sm text-muted">
            Unique visitors who discovered your novels, broken down by novel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle active="monthly" />
          <div className="text-right">
            <p className="text-xs text-muted">This month</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {currentMonthTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface px-4 pb-4 pt-3">
        {grandTotal === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No view data yet.</p>
        ) : (
          <>
            <SvgBarChart bars={bars} colorById={colorById} highlightLast />
            {activeNovels.length > 0 && (
              <ChartLegend novels={activeNovels} colorById={colorById} />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function DailyViewsChart({
  data,
  novels,
}: {
  data: DailyViewPoint[];
  novels: { id: string; title: string }[];
}) {
  const colorById = new Map(
    novels.map((n, i) => [n.id, NOVEL_COLORS[i % NOVEL_COLORS.length]]),
  );
  const totals = data.map((d) =>
    Object.values(d.byNovel).reduce((s, c) => s + c, 0),
  );
  const monthTotal = totals.reduce((s, c) => s + c, 0);
  const activeNovels = novels.filter((n) =>
    data.some((d) => (d.byNovel[n.id] ?? 0) > 0),
  );

  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];
  const today = now.getDate();

  // Show label every 5 days, always show day 1 and today.
  const bars: ChartBar[] = data.map(({ day, byNovel }, i) => {
    const dayNum = i + 1;
    const showLabel = dayNum === 1 || dayNum % 5 === 0 || dayNum === today;
    return {
      key: day,
      xLabel: String(dayNum),
      showLabel,
      total: totals[i],
      segments: novels
        .map((n) => ({ id: n.id, count: byNovel[n.id] ?? 0 }))
        .filter((s) => s.count > 0),
    };
  });

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            New readers — {monthName} {now.getFullYear()}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Day-by-day unique visitors for the current month.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle active="daily" />
          <div className="text-right">
            <p className="text-xs text-muted">Month total</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {monthTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface px-4 pb-4 pt-3">
        {monthTotal === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No views yet this month.</p>
        ) : (
          <>
            <SvgBarChart bars={bars} colorById={colorById} highlightLast />
            {activeNovels.length > 0 && (
              <ChartLegend novels={activeNovels} colorById={colorById} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
