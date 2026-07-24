import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  buildViewSeries,
  parseViewsRange,
  type ViewSeriesPoint,
  type ViewsRange,
} from "@/lib/view-series";
import {
  WORKSPACE_BASE,
  WORKSPACE_LABELS,
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";

const CHART_STROKE = "var(--accent)";

const BAR_PT = 16;
const BAR_PB = 28;
const BAR_PL = 40;
const BAR_PR = 12;
const BAR_PLOT_H = 180;
const BAR_REF_W = 720;

function niceMax(v: number): number {
  if (v <= 0) return 5;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

/** Catmull-Rom → cubic Bezier smooth path through points. */
function smoothLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p.x} ${p.y}`;
  }
  if (points.length === 2) {
    const [a, b] = points;
    return `M ${a!.x} ${a!.y} L ${b!.x} ${b!.y}`;
  }

  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? 0 : i - 1]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const RANGE_LABELS: Record<ViewsRange, string> = {
  day: "Last 30 days",
  week: "Last 12 weeks",
  month: "Last 12 months",
  year: "Last 5 years",
};

export async function WorkspaceNovelStatsPage({
  workspace,
  novelId,
  range: rangeParam,
}: {
  workspace: WorkspaceKind;
  novelId: string;
  range?: string;
}) {
  const range = parseViewsRange(rangeParam);
  const base = WORKSPACE_BASE[workspace];
  const access = await getAdminAccess();
  const admin = createAdminClient();

  const { data: novel } = await admin
    .from("novels")
    .select("id, title, slug, publisher_id, publication_type, view_count")
    .eq("id", novelId)
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }
  if (novel.publication_type !== WORKSPACE_PUBLICATION_TYPE[workspace]) {
    notFound();
  }

  // Pull enough daily history for the widest range (5 years).
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - 5);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: dailyRows } = await admin
    .from("novel_view_daily")
    .select("day, view_count")
    .eq("novel_id", novel.id)
    .gte("day", sinceIso)
    .order("day", { ascending: true });

  const series = buildViewSeries(
    (dailyRows ?? []) as { day: string; view_count: number }[],
    range,
  );
  const periodTotal = series.reduce((sum, p) => sum + p.count, 0);
  const allTimeViews = Number(novel.view_count ?? 0);
  const statsBase = `${base}/novels/${novelId}/stats`;

  return (
    <PageContainer as="div">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Link
          href={base}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
          Back to{" "}
          {WORKSPACE_LABELS[workspace].noun === "series" ? "series" : "novels"}
        </Link>
        <div className="min-w-0">
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            title={novel.title}
          >
            {novel.title.length > 50
              ? `${novel.title.slice(0, 50)}...`
              : novel.title}
          </h1>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Views</h2>
            <p className="mt-0.5 text-sm text-muted">
              Chapter page views for {novel.title}.
            </p>
          </div>
          <RangeToggle active={range} base={statsBase} />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-muted">
              {RANGE_LABELS[range]}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <p className="font-semibold tabular-nums text-foreground">
                {periodTotal.toLocaleString()}{" "}
                <span className="font-medium text-muted">in period</span>
              </p>
              <p className="tabular-nums text-muted">
                {allTimeViews.toLocaleString()} all time
              </p>
            </div>
          </div>

          {periodTotal === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No views in this period yet.
            </p>
          ) : (
            <div className="mt-3">
              <SmoothedAreaChart series={series} range={range} />
            </div>
          )}
        </div>
      </section>
    </PageContainer>
  );
}

function RangeToggle({
  active,
  base,
}: {
  active: ViewsRange;
  base: string;
}) {
  const options: { range: ViewsRange; label: string }[] = [
    { range: "day", label: "Days" },
    { range: "week", label: "Weeks" },
    { range: "month", label: "Months" },
    { range: "year", label: "Years" },
  ];

  return (
    <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-medium">
      {options.map((option) => {
        const href =
          option.range === "day" ? base : `${base}?range=${option.range}`;
        return (
          <a
            key={option.range}
            href={href}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active === option.range
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </a>
        );
      })}
    </div>
  );
}

function SmoothedAreaChart({
  series,
  range,
}: {
  series: ViewSeriesPoint[];
  range: ViewsRange;
}) {
  const maxY = niceMax(Math.max(...series.map((p) => p.count), 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxY));
  const plotW = BAR_REF_W - BAR_PL - BAR_PR;
  const plotBottom = BAR_PT + BAR_PLOT_H;
  const n = Math.max(series.length, 1);

  const points = series.map((point, i) => {
    const x =
      n === 1
        ? BAR_PL + plotW / 2
        : BAR_PL + (i / (n - 1)) * plotW;
    const y = plotBottom - (point.count / maxY) * BAR_PLOT_H;
    return { x, y, point };
  });

  const linePath = smoothLinePath(points.map((p) => ({ x: p.x, y: p.y })));
  const areaPath =
    points.length === 0
      ? ""
      : `${linePath} L ${points[points.length - 1]!.x} ${plotBottom} L ${points[0]!.x} ${plotBottom} Z`;

  const labelEvery =
    range === "day" ? 5 : range === "week" ? 2 : range === "month" ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${BAR_REF_W} ${BAR_PT + BAR_PLOT_H + BAR_PB}`}
      className="w-full"
      style={{ display: "block" }}
      role="img"
      aria-label="Views over time"
    >
      <defs>
        <linearGradient id="views-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

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

      {areaPath ? (
        <path d={areaPath} fill="url(#views-area-fill)" stroke="none" />
      ) : null}
      {linePath ? (
        <path
          d={linePath}
          fill="none"
          stroke={CHART_STROKE}
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {points.map(({ x, y, point }, i) => {
        const showLabel =
          i === 0 ||
          i === points.length - 1 ||
          i % labelEvery === 0;
        return (
          <g key={point.key}>
            <circle
              cx={x}
              cy={y}
              r={point.count > 0 ? 2.75 : 0}
              fill={CHART_STROKE}
            >
              <title>
                {point.label}: {point.count.toLocaleString()} views
              </title>
            </circle>
            {showLabel ? (
              <text
                x={x}
                y={plotBottom + 16}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                fillOpacity="0.45"
                fontFamily="inherit"
              >
                {point.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
