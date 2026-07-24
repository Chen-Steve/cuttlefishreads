import { notFound } from "next/navigation";
import { Bookmark, Cookie, Eye, ShoppingCart } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  getAllTimeViewsBySlug,
  getGoogleAnalyticsDashboard,
  isGoogleAnalyticsConfigured,
  type GoogleAnalyticsDashboard,
  type ViewsMode,
} from "@/lib/google-analytics";
import {
  WORKSPACE_BASE,
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";

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

export async function WorkspaceDashboardPage({
  workspace,
  view,
}: {
  workspace: WorkspaceKind;
  view?: string;
}) {
  const mode: ViewsMode =
    view === "monthly" ? "monthly" : view === "all" ? "all" : "daily";
  const access = await getAdminAccess();
  if (!access) notFound();

  const base = WORKSPACE_BASE[workspace];
  // Originals are always free to read — no purchases or cookie earnings.
  const showEarnings = workspace === "translations";

  const admin = createAdminClient();

  let novelsQuery = admin
    .from("novels")
    .select("id, slug, title")
    .eq("publication_type", WORKSPACE_PUBLICATION_TYPE[workspace])
    .order("updated_at", { ascending: false });

  if (!access.isMasterAdmin) {
    novelsQuery = novelsQuery.eq("publisher_id", access.userId);
  }

  const { data: novels } = await novelsQuery.returns<
    { id: string; slug: string; title: string }[]
  >();

  const rows = novels ?? [];
  const novelIds = rows.map((n) => n.id);
  const slugs = rows.map((n) => n.slug);

  // Views: all-time totals always come from getAllTimeViewsBySlug (same as
  // public novel pages). Chart reports are only fetched for daily/monthly modes.
  const emptyAnalytics: GoogleAnalyticsDashboard = {
    configured: isGoogleAnalyticsConfigured(),
    error: false,
    dailyViews: [],
    monthlyViews: [],
  };

  const [bookmarksRes, unlocksRes, googleAnalytics, allTimeViewsBySlug] =
    novelIds.length === 0
      ? [
          { data: [] },
          { data: [] },
          emptyAnalytics,
          {} as Record<string, number>,
        ]
      : await Promise.all([
          admin.from("bookmarks").select("novel_id").in("novel_id", novelIds),
          showEarnings
            ? admin
                .from("chapter_unlocks")
                .select(
                  "novel_slug, chapter_number, translator_share, created_at, user_id",
                )
                .in("novel_slug", slugs)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] }),
          mode === "all"
            ? Promise.resolve(emptyAnalytics)
            : getGoogleAnalyticsDashboard(slugs, mode),
          getAllTimeViewsBySlug(slugs),
        ]);

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
  const novelsWithPurchases = rows.filter((n) => purchasesByNovel.has(n.slug));

  // Earnings are the exact translator share credited per unlock (70% of list).
  const stats: NovelStat[] = rows.map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    views: allTimeViewsBySlug[n.slug] ?? 0,
    bookmarks: bookmarksByNovel.get(n.id) ?? 0,
    purchases: purchasesBySlug.get(n.slug) ?? 0,
    coinsEarned: earnedBySlug.get(n.slug) ?? 0,
  }));

  const totals = stats.reduce(
    (acc, s) => ({
      bookmarks: acc.bookmarks + s.bookmarks,
      purchases: acc.purchases + s.purchases,
      coinsEarned: acc.coinsEarned + s.coinsEarned,
    }),
    { bookmarks: 0, purchases: 0, coinsEarned: 0 },
  );

  // Always all-time so this matches the view counts on public novel pages
  // (novel page + chapter pages, same GA query and cache).
  const totalViews = Object.values(allTimeViewsBySlug).reduce(
    (sum, n) => sum + n,
    0,
  );
  const viewsLabel = "All-time views";

  return (
    <PageContainer as="div">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Dashboard
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        {showEarnings
          ? "Views, bookmarks, and chapter purchases across your novels."
          : "Views and bookmarks across your series."}
      </p>

      <div
        className={`mt-6 grid grid-cols-2 gap-3 ${showEarnings ? "sm:grid-cols-4" : ""}`}
      >
        <SummaryCard icon={<Eye className="size-4" />} label={viewsLabel} value={totalViews} />
        <SummaryCard icon={<Bookmark className="size-4" />} label="Bookmarks" value={totals.bookmarks} />
        {showEarnings ? (
          <>
            <SummaryCard icon={<ShoppingCart className="size-4" />} label="Purchases" value={totals.purchases} />
            <SummaryCard icon={<Cookie className="size-4" />} label="Cookies earned" value={totals.coinsEarned} />
          </>
        ) : null}
      </div>

      <GoogleAnalyticsSection
        analytics={googleAnalytics}
        allTimeViewsBySlug={allTimeViewsBySlug}
        novels={rows}
        mode={mode}
        base={base}
      />

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
        {stats.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">
            No {workspace === "originals" ? "series" : "novels"} yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">
                  {workspace === "originals" ? "Series" : "Novel"}
                </th>
                <th className="px-4 py-3 text-right font-medium">Views</th>
                <th className="px-4 py-3 text-right font-medium">Bookmarks</th>
                {showEarnings ? (
                  <>
                    <th className="px-4 py-3 text-right font-medium">Purchases</th>
                    <th className="px-4 py-3 text-right font-medium">Cookies</th>
                  </>
                ) : null}
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
                  {showEarnings ? (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {s.purchases.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        {formatCoins(s.coinsEarned)}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEarnings ? (
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
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
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
                            <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
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
      ) : null}
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

function GoogleAnalyticsSection({
  analytics,
  allTimeViewsBySlug,
  novels,
  mode,
  base,
}: {
  analytics: GoogleAnalyticsDashboard;
  allTimeViewsBySlug: Record<string, number>;
  novels: { id: string; slug: string; title: string }[];
  mode: ViewsMode;
  base: string;
}) {
  if (!analytics.configured) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
        <h2 className="text-sm font-semibold text-foreground">
          Connect Google Analytics
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted">
          Add the Google Analytics property ID, service-account email, and
          private key to the server environment to display GA4 data here.
        </p>
      </section>
    );
  }

  if (analytics.error) {
    return (
      <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-6">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
          Google Analytics is unavailable
        </h2>
        <p className="mt-1 text-sm text-muted">
          Check the GA4 property ID, service-account credentials, Data API
          access, and the service account&apos;s Viewer permission.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Views</h2>
          <p className="mt-0.5 text-sm text-muted">
            Each novel&apos;s total combines its novel page and all chapter
            page views.
          </p>
        </div>
        <ViewToggle active={mode} base={base} />
      </div>

      <ViewsChart
        analytics={analytics}
        allTimeViewsBySlug={allTimeViewsBySlug}
        novels={novels}
        mode={mode}
      />
    </section>
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

function ViewToggle({ active, base }: { active: ViewsMode; base: string }) {
  const options: { mode: ViewsMode; href: string; label: string }[] = [
    { mode: "daily", href: `${base}/dashboard`, label: "This month" },
    {
      mode: "monthly",
      href: `${base}/dashboard?view=monthly`,
      label: "By month",
    },
    { mode: "all", href: `${base}/dashboard?view=all`, label: "All time" },
  ];

  return (
    <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-medium">
      {options.map((option) => (
        <a
          key={option.mode}
          href={option.href}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            active === option.mode
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {option.label}
        </a>
      ))}
    </div>
  );
}

// Stacked bar chart (per day or per month), with native SVG tooltips.
type ChartBar = {
  key: string;
  xLabel: string;
  showLabel: boolean;
  tooltipLabel: string;
  segments: { slug: string; title: string; count: number }[];
};

const BAR_PT = 12;
const BAR_PB = 26;
const BAR_PL = 40;
const BAR_PR = 8;
const BAR_PLOT_H = 160;
const BAR_REF_W = 680;

function niceMax(v: number): number {
  if (v <= 0) return 5;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

function SvgBarChart({
  bars,
  colorBySlug,
}: {
  bars: ChartBar[];
  colorBySlug: Map<string, string>;
}) {
  const totals = bars.map((b) =>
    b.segments.reduce((sum, s) => sum + s.count, 0),
  );
  const maxY = niceMax(Math.max(...totals, 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxY));

  const plotW = BAR_REF_W - BAR_PL - BAR_PR;
  const slot = plotW / Math.max(bars.length, 1);
  const barW = Math.max(slot * 0.65, 2);
  const barOffset = (slot - barW) / 2;
  const plotBottom = BAR_PT + BAR_PLOT_H;

  return (
    <svg
      viewBox={`0 0 ${BAR_REF_W} ${BAR_PT + BAR_PLOT_H + BAR_PB}`}
      className="w-full"
      style={{ display: "block" }}
      role="img"
      aria-label="Views per novel"
    >
      {ticks.map((tick) => {
        const y = BAR_PT + BAR_PLOT_H - (tick / maxY) * BAR_PLOT_H;
        return (
          <g key={tick}>
            <line
              x1={BAR_PL}
              y1={y}
              x2={BAR_REF_W - BAR_PR}
              y2={y}
              stroke="currentColor"
              strokeOpacity={tick === 0 ? 0.2 : 0.08}
              strokeWidth="1"
            />
            <text
              x={BAR_PL - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.45"
              fontFamily="inherit"
            >
              {tick.toLocaleString()}
            </text>
          </g>
        );
      })}

      {bars.map((bar, i) => {
        const x = BAR_PL + i * slot + barOffset;
        let currentY = plotBottom;

        return (
          <g key={bar.key}>
            {bar.segments.map((seg) => {
              const segH = Math.max((seg.count / maxY) * BAR_PLOT_H, 0);
              const rectY = currentY - segH;
              currentY -= segH;
              return (
                <rect
                  key={seg.slug}
                  x={x}
                  y={rectY}
                  width={barW}
                  height={segH}
                  fill={colorBySlug.get(seg.slug) ?? "#6366f1"}
                  rx="2"
                  className="hover:opacity-75"
                >
                  <title>{`${seg.title}: ${seg.count.toLocaleString()} views (${bar.tooltipLabel})`}</title>
                </rect>
              );
            })}
            {totals[i] === 0 && (
              <rect
                x={x}
                y={plotBottom - 1}
                width={barW}
                height={1}
                fill="currentColor"
                fillOpacity="0.1"
              />
            )}
            {bar.showLabel && (
              <text
                x={x + barW / 2}
                y={plotBottom + 16}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                fillOpacity="0.5"
                fontFamily="inherit"
              >
                {bar.xLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

type PieSlice = {
  id: string;
  title: string;
  count: number;
  share: number;
};

function pieSlicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function PieChart({
  slices,
  colorById,
}: {
  slices: PieSlice[];
  colorById: Map<string, string>;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  // Native SVG tooltips: hovering a slice shows the novel name and count.
  let angle = -Math.PI / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-56"
      role="img"
      aria-label="Views per novel"
    >
      {slices.length === 1 ? (
        <circle cx={cx} cy={cy} r={r} fill={colorById.get(slices[0].id)}>
          <title>{`${slices[0].title}: ${slices[0].count.toLocaleString()} views (100%)`}</title>
        </circle>
      ) : (
        slices.map((slice) => {
          const start = angle;
          const end = start + slice.share * Math.PI * 2;
          angle = end;
          return (
            <path
              key={slice.id}
              d={pieSlicePath(cx, cy, r, start, end)}
              fill={colorById.get(slice.id)}
              stroke="var(--color-surface, #fff)"
              strokeWidth="1.5"
              className="transition-opacity hover:opacity-75"
            >
              <title>{`${slice.title}: ${slice.count.toLocaleString()} views (${Math.round(slice.share * 100)}%)`}</title>
            </path>
          );
        })
      )}
    </svg>
  );
}

function ViewsChart({
  analytics,
  allTimeViewsBySlug,
  novels,
  mode,
}: {
  analytics: GoogleAnalyticsDashboard;
  allTimeViewsBySlug: Record<string, number>;
  novels: { id: string; slug: string; title: string }[];
  mode: ViewsMode;
}) {
  const colorBySlug = new Map(
    novels.map((n, i) => [n.slug, NOVEL_COLORS[i % NOVEL_COLORS.length]]),
  );
  const now = new Date();

  const toSegments = (bySlug: Record<string, number>) =>
    novels
      .map((n) => ({
        slug: n.slug,
        title: n.title,
        count: bySlug[n.slug] ?? 0,
      }))
      .filter((s) => s.count > 0);

  let bars: ChartBar[] = [];
  let periodLabel = "";

  if (mode === "daily") {
    periodLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    const today = now.getDate();
    bars = analytics.dailyViews.map((point, i) => {
      const dayNum = i + 1;
      return {
        key: point.date,
        xLabel: String(dayNum),
        showLabel: dayNum === 1 || dayNum % 5 === 0 || dayNum === today,
        tooltipLabel: point.date,
        segments: toSegments(point.bySlug),
      };
    });
  } else if (mode === "monthly") {
    periodLabel = "By month";
    bars = analytics.monthlyViews.map((point) => {
      const [year, m] = point.month.split("-");
      const label = `${MONTH_NAMES[parseInt(m, 10) - 1]} '${year.slice(2)}`;
      return {
        key: point.month,
        xLabel: label,
        showLabel: true,
        tooltipLabel: label,
        segments: toSegments(point.bySlug),
      };
    });
  } else {
    periodLabel = "All time";
  }

  // Same all-time totals as public novel pages (novel page + chapter pages).
  const allTimeTotal = novels.reduce(
    (sum, n) => sum + (allTimeViewsBySlug[n.slug] ?? 0),
    0,
  );
  const total =
    mode === "all"
      ? allTimeTotal
      : bars.reduce(
          (sum, bar) =>
            sum + bar.segments.reduce((s, seg) => s + seg.count, 0),
          0,
        );

  const slices: PieSlice[] = novels
    .map((n) => ({
      id: n.slug,
      title: n.title,
      count: allTimeViewsBySlug[n.slug] ?? 0,
      share:
        allTimeTotal > 0
          ? (allTimeViewsBySlug[n.slug] ?? 0) / allTimeTotal
          : 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const activeNovels = novels.filter((n) =>
    mode === "all"
      ? (allTimeViewsBySlug[n.slug] ?? 0) > 0
      : bars.some((bar) => bar.segments.some((s) => s.slug === n.slug)),
  );

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium text-muted">{periodLabel}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {total.toLocaleString()} views
        </p>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No views in this period.
        </p>
      ) : mode === "all" ? (
        <div className="mt-3 flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <PieChart slices={slices} colorById={colorBySlug} />
          <ul className="flex w-full min-w-0 flex-1 flex-col gap-2">
            {slices.map((slice) => (
              <li
                key={slice.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: colorBySlug.get(slice.id) }}
                  />
                  <span className="truncate text-foreground">
                    {slice.title}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {slice.count.toLocaleString()} ·{" "}
                  {Math.round(slice.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="mt-2">
            <SvgBarChart bars={bars} colorBySlug={colorBySlug} />
          </div>
          {activeNovels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {activeNovels.map((n) => (
                <div key={n.id} className="flex items-center gap-1.5">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: colorBySlug.get(n.slug) }}
                  />
                  <span className="text-xs text-muted">
                    {n.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
