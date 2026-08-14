"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const KAPPA = 0.5522847498;
const OUTER_R = 12;
const STEP_R = 24;
const TAB_H = 36;

type ShellMetrics = {
  width: number;
  height: number;
  headerHeight: number;
  leftTabWidth: number;
  rightTabWidth: number;
  topCenterTabWidth: number;
  bottomLeftTabWidth: number;
  bottomRightTabWidth: number;
  bottomCenterTabWidth: number;
  footerHeight: number;
};

function buildTabPanelShellPath({
  width,
  height,
  headerHeight,
  leftTabWidth,
  rightTabWidth,
  topCenterTabWidth,
  bottomLeftTabWidth,
  bottomRightTabWidth,
  bottomCenterTabWidth,
  footerHeight,
}: ShellMetrics) {
  if (width < 8 || height < 8) return "";

  const inset = 0.5;
  const x0 = inset;
  const y0 = inset;
  const x1 = width - inset;
  const y1 = height - inset;
  const or = OUTER_R;
  const ko = KAPPA * or;
  const hasLeft = leftTabWidth > 0;
  const hasRight = rightTabWidth > 0;
  const hasTopCenter = topCenterTabWidth > 0 && !hasLeft && !hasRight;
  const hasBottomLeft = bottomLeftTabWidth > 0;
  const hasBottomRight = bottomRightTabWidth > 0;
  const hasBottomCenter =
    bottomCenterTabWidth > 0 && !hasBottomLeft && !hasBottomRight;
  const tabY = hasLeft || hasRight || hasTopCenter ? headerHeight : y0;
  const sr = Math.min(STEP_R, Math.max(8, tabY - or));
  const ks = KAPPA * sr;
  const leftW = hasLeft ? Math.max(leftTabWidth, or * 2 + 8) : 0;
  const rightW = hasRight ? Math.max(rightTabWidth, or * 2 + 8) : 0;
  const bottomLeftW = hasBottomLeft
    ? Math.max(bottomLeftTabWidth, or * 2 + 8)
    : 0;
  const bottomRightW = hasBottomRight
    ? Math.max(bottomRightTabWidth, or * 2 + 8)
    : 0;
  const hasFooter = hasBottomLeft || hasBottomRight || hasBottomCenter;
  const bodyBottomY = hasFooter ? height - footerHeight : y1;
  const bsr = hasFooter
    ? Math.min(STEP_R, Math.max(8, footerHeight - or))
    : sr;
  const bks = KAPPA * bsr;
  const stepStartY = tabY - sr;
  const sideRoom = or + 8;
  const topCenterW = hasTopCenter
    ? Math.min(
        Math.max(topCenterTabWidth, or * 2 + 8),
        Math.max(or * 2 + 8, x1 - x0 - sideRoom * 2),
      )
    : 0;
  const topTabLeft = (x0 + x1 - topCenterW) / 2;
  const topTabRight = topTabLeft + topCenterW;
  const topSr = hasTopCenter
    ? Math.min(
        sr,
        Math.max(0, topTabLeft - x0 - or),
        Math.max(0, x1 - topTabRight - or),
      )
    : sr;
  const tks = KAPPA * topSr;
  const bottomCenterW = hasBottomCenter
    ? Math.min(
        Math.max(bottomCenterTabWidth, or * 2 + 8),
        Math.max(or * 2 + 8, x1 - x0),
      )
    : 0;
  const tabLeft = (x0 + x1 - bottomCenterW) / 2;
  const tabRight = tabLeft + bottomCenterW;
  const centerSr = hasBottomCenter
    ? Math.min(
        bsr,
        Math.max(0, tabLeft - x0 - or),
        Math.max(0, x1 - tabRight - or),
      )
    : bsr;
  const cks = KAPPA * centerSr;

  const p: string[] = [];
  const M = (x: number, y: number) => p.push(`M${x} ${y}`);
  const L = (x: number, y: number) => p.push(`L${x} ${y}`);
  const C = (
    c1x: number,
    c1y: number,
    c2x: number,
    c2y: number,
    x: number,
    y: number,
  ) => p.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`);

  if (hasLeft) {
    M(x0 + or, y0);
    L(x0 + leftW - or, y0);
    C(x0 + leftW - or + ko, y0, x0 + leftW, y0 + or - ko, x0 + leftW, y0 + or);
    if (y0 + or < stepStartY - 0.25) L(x0 + leftW, stepStartY);
    C(
      x0 + leftW,
      stepStartY + ks,
      x0 + leftW + sr - ks,
      tabY,
      x0 + leftW + sr,
      tabY,
    );
  } else if (hasTopCenter) {
    M(topTabLeft + or, y0);
    L(topTabRight - or, y0);
    C(
      topTabRight - or + ko,
      y0,
      topTabRight,
      y0 + or - ko,
      topTabRight,
      y0 + or,
    );
    if (topSr >= 1) {
      if (y0 + or < tabY - topSr - 0.25) L(topTabRight, tabY - topSr);
      C(
        topTabRight,
        tabY - topSr + tks,
        topTabRight + topSr - tks,
        tabY,
        topTabRight + topSr,
        tabY,
      );
    } else {
      L(topTabRight, tabY);
    }
  } else {
    M(x0 + or, tabY);
  }

  if (hasRight) {
    L(x1 - rightW - sr, tabY);
    C(
      x1 - rightW - sr + ks,
      tabY,
      x1 - rightW,
      stepStartY + ks,
      x1 - rightW,
      stepStartY,
    );
    if (y0 + or < stepStartY - 0.25) L(x1 - rightW, y0 + or);
    C(x1 - rightW, y0 + or - ko, x1 - rightW + or - ko, y0, x1 - rightW + or, y0);
    L(x1 - or, y0);
    C(x1 - or + ko, y0, x1, y0 + or - ko, x1, y0 + or);
    L(x1, (hasBottomRight ? y1 : bodyBottomY) - or);
  } else {
    L(x1 - or, tabY);
    C(x1 - or + ko, tabY, x1, tabY + or - ko, x1, tabY + or);
    L(x1, (hasBottomRight ? y1 : bodyBottomY) - or);
  }

  if (hasBottomRight) {
    C(x1, y1 - or + ko, x1 - or + ko, y1, x1 - or, y1);
    L(x1 - bottomRightW + or, y1);
    C(
      x1 - bottomRightW + or - ko,
      y1,
      x1 - bottomRightW,
      y1 - or + ko,
      x1 - bottomRightW,
      y1 - or,
    );
    if (y1 - or > bodyBottomY + bsr + 0.25) {
      L(x1 - bottomRightW, bodyBottomY + bsr);
    }
    C(
      x1 - bottomRightW,
      bodyBottomY + bsr - bks,
      x1 - bottomRightW - bsr + bks,
      bodyBottomY,
      x1 - bottomRightW - bsr,
      bodyBottomY,
    );
  } else if (hasBottomCenter) {
    C(
      x1,
      bodyBottomY - or + ko,
      x1 - or + ko,
      bodyBottomY,
      x1 - or,
      bodyBottomY,
    );
    if (centerSr >= 1) {
      L(tabRight + centerSr, bodyBottomY);
      C(
        tabRight + centerSr - cks,
        bodyBottomY,
        tabRight,
        bodyBottomY + centerSr - cks,
        tabRight,
        bodyBottomY + centerSr,
      );
    } else {
      L(tabRight, bodyBottomY);
    }
    if (bodyBottomY + centerSr < y1 - or - 0.25) L(tabRight, y1 - or);
    C(tabRight, y1 - or + ko, tabRight - or + ko, y1, tabRight - or, y1);
    L(tabLeft + or, y1);
    C(tabLeft + or - ko, y1, tabLeft, y1 - or + ko, tabLeft, y1 - or);
    if (centerSr >= 1) {
      if (bodyBottomY + centerSr < y1 - or - 0.25) {
        L(tabLeft, bodyBottomY + centerSr);
      }
      C(
        tabLeft,
        bodyBottomY + centerSr - cks,
        tabLeft - centerSr + cks,
        bodyBottomY,
        tabLeft - centerSr,
        bodyBottomY,
      );
    }
  } else {
    C(
      x1,
      bodyBottomY - or + ko,
      x1 - or + ko,
      bodyBottomY,
      x1 - or,
      bodyBottomY,
    );
  }

  if (hasBottomCenter) {
    L(x0 + or, bodyBottomY);
    C(
      x0 + or - ko,
      bodyBottomY,
      x0,
      bodyBottomY - or + ko,
      x0,
      bodyBottomY - or,
    );
  } else if (hasBottomLeft) {
    L(x0 + bottomLeftW + bsr, bodyBottomY);
    C(
      x0 + bottomLeftW + bsr - bks,
      bodyBottomY,
      x0 + bottomLeftW,
      bodyBottomY + bsr - bks,
      x0 + bottomLeftW,
      bodyBottomY + bsr,
    );
    if (y1 - or > bodyBottomY + bsr + 0.25) L(x0 + bottomLeftW, y1 - or);
    C(
      x0 + bottomLeftW,
      y1 - or + ko,
      x0 + bottomLeftW - or + ko,
      y1,
      x0 + bottomLeftW - or,
      y1,
    );
    L(x0 + or, y1);
    C(x0 + or - ko, y1, x0, y1 - or + ko, x0, y1 - or);
  } else {
    L(x0 + or, bodyBottomY);
    C(
      x0 + or - ko,
      bodyBottomY,
      x0,
      bodyBottomY - or + ko,
      x0,
      bodyBottomY - or,
    );
  }

  if (hasLeft) {
    L(x0, y0 + or);
    C(x0, y0 + or - ko, x0 + or - ko, y0, x0 + or, y0);
  } else if (hasTopCenter) {
    L(x0, tabY + or);
    C(x0, tabY + or - ko, x0 + or - ko, tabY, x0 + or, tabY);
    if (topSr >= 1) {
      L(topTabLeft - topSr, tabY);
      C(
        topTabLeft - topSr + tks,
        tabY,
        topTabLeft,
        tabY - topSr + tks,
        topTabLeft,
        tabY - topSr,
      );
    } else {
      L(topTabLeft, tabY);
    }
    if (tabY - topSr > y0 + or + 0.25) L(topTabLeft, y0 + or);
    C(
      topTabLeft,
      y0 + or - ko,
      topTabLeft + or - ko,
      y0,
      topTabLeft + or,
      y0,
    );
  } else {
    L(x0, tabY + or);
    C(x0, tabY + or - ko, x0 + or - ko, tabY, x0 + or, tabY);
  }

  p.push("Z");
  return p.join(" ");
}

export function TabPanelShell({
  leftTab,
  rightTab,
  topCenterTab,
  bottomLeftTab,
  bottomRightTab,
  bottomCenterTab,
  children,
  className,
}: {
  leftTab?: ReactNode;
  rightTab?: ReactNode;
  topCenterTab?: ReactNode;
  bottomLeftTab?: ReactNode;
  bottomRightTab?: ReactNode;
  bottomCenterTab?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const leftTabRef = useRef<HTMLDivElement>(null);
  const rightTabRef = useRef<HTMLDivElement>(null);
  const topCenterTabRef = useRef<HTMLDivElement>(null);
  const bottomLeftTabRef = useRef<HTMLDivElement>(null);
  const bottomRightTabRef = useRef<HTMLDivElement>(null);
  const bottomCenterTabRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ShellMetrics>({
    width: 0,
    height: 0,
    headerHeight: TAB_H,
    leftTabWidth: 0,
    rightTabWidth: 0,
    topCenterTabWidth: 0,
    bottomLeftTabWidth: 0,
    bottomRightTabWidth: 0,
    bottomCenterTabWidth: 0,
    footerHeight: 0,
  });

  const hasLeft = Boolean(leftTab);
  const hasRight = Boolean(rightTab);
  const hasTopCenter = Boolean(topCenterTab);
  const hasBottomLeft = Boolean(bottomLeftTab);
  const hasBottomRight = Boolean(bottomRightTab);
  const hasBottomCenter = Boolean(bottomCenterTab);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      setMetrics({
        width: shell.offsetWidth,
        height: shell.offsetHeight,
        headerHeight:
          leftTabRef.current?.offsetHeight ||
          rightTabRef.current?.offsetHeight ||
          topCenterTabRef.current?.offsetHeight ||
          (hasLeft || hasRight || hasTopCenter ? TAB_H : 0),
        leftTabWidth: leftTabRef.current?.offsetWidth ?? 0,
        rightTabWidth: rightTabRef.current?.offsetWidth ?? 0,
        topCenterTabWidth: topCenterTabRef.current?.offsetWidth ?? 0,
        bottomLeftTabWidth: bottomLeftTabRef.current?.offsetWidth ?? 0,
        bottomRightTabWidth: bottomRightTabRef.current?.offsetWidth ?? 0,
        bottomCenterTabWidth: bottomCenterTabRef.current?.offsetWidth ?? 0,
        footerHeight: Math.max(
          bottomLeftTabRef.current?.offsetHeight ?? 0,
          bottomRightTabRef.current?.offsetHeight ?? 0,
          bottomCenterTabRef.current?.offsetHeight ?? 0,
        ),
      });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(shell);
    if (leftTabRef.current) ro.observe(leftTabRef.current);
    if (rightTabRef.current) ro.observe(rightTabRef.current);
    if (topCenterTabRef.current) ro.observe(topCenterTabRef.current);
    if (bottomLeftTabRef.current) ro.observe(bottomLeftTabRef.current);
    if (bottomRightTabRef.current) ro.observe(bottomRightTabRef.current);
    if (bottomCenterTabRef.current) ro.observe(bottomCenterTabRef.current);
    measure();
    return () => ro.disconnect();
  }, [hasLeft, hasRight, hasTopCenter, hasBottomLeft, hasBottomRight, hasBottomCenter]);

  const shellPath = useMemo(() => buildTabPanelShellPath(metrics), [metrics]);

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative",
        !shellPath && "rounded-xl border border-border bg-surface",
        className,
      )}
    >
      {shellPath ? (
        <svg
          aria-hidden
          width={metrics.width}
          height={metrics.height}
          viewBox={`0 0 ${metrics.width} ${metrics.height}`}
          className="pointer-events-none absolute inset-0"
          shapeRendering="geometricPrecision"
        >
          <path
            d={shellPath}
            className="fill-surface stroke-border"
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      ) : null}

      <div className="relative">
        {hasTopCenter ? (
          <div className="flex justify-center">
            <div ref={topCenterTabRef} className="w-fit max-w-full shrink-0">
              {topCenterTab}
            </div>
          </div>
        ) : hasLeft || hasRight ? (
          <div
            className={cn(
              "flex items-stretch",
              hasLeft && hasRight
                ? "justify-between"
                : hasRight
                  ? "justify-end"
                  : "justify-start",
            )}
          >
            {hasLeft ? (
              <div ref={leftTabRef} className="shrink-0">
                {leftTab}
              </div>
            ) : null}
            {hasRight ? (
              <div ref={rightTabRef} className="shrink-0">
                {rightTab}
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
        {hasBottomLeft || hasBottomRight || hasBottomCenter ? (
          <div
            className={cn(
              "flex items-stretch",
              hasBottomLeft && hasBottomRight
                ? "justify-between"
                : hasBottomRight
                  ? "justify-end"
                  : hasBottomCenter
                    ? "justify-center"
                    : "justify-start",
            )}
          >
            {hasBottomLeft ? (
              <div ref={bottomLeftTabRef} className="w-fit shrink-0">
                {bottomLeftTab}
              </div>
            ) : null}
            {hasBottomCenter ? (
              <div ref={bottomCenterTabRef} className="w-fit max-w-full shrink-0">
                {bottomCenterTab}
              </div>
            ) : null}
            {hasBottomRight ? (
              <div ref={bottomRightTabRef} className="w-fit shrink-0">
                {bottomRightTab}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type RailMetrics = {
  width: number;
  height: number;
  tabWidth: number;
  leftTabWidth: number;
  rightTabWidth: number;
};

type RailPaths = {
  stroke: string;
  fills: string[];
};

const EMPTY_RAIL: RailPaths = { stroke: "", fills: [] };

function railGeometry({ width, height, tabWidth }: RailMetrics) {
  const inset = 0.5;
  const x0 = inset;
  const y0 = inset;
  const x1 = width - inset;
  const y1 = height - inset;
  const or = OUTER_R;
  const ko = KAPPA * or;
  const sideRoom = or + 8;
  const tabW = Math.min(
    Math.max(tabWidth, or * 2 + 8),
    Math.max(or * 2 + 8, x1 - x0 - sideRoom * 2),
  );
  const tabLeft = (x0 + x1 - tabW) / 2;
  const tabRight = tabLeft + tabW;
  const sr = Math.min(
    STEP_R,
    Math.max(8, height - or),
    Math.max(0, tabLeft - x0 - or),
    Math.max(0, x1 - tabRight - or),
  );
  const ks = KAPPA * sr;
  return { x0, y0, x1, y1, or, ko, tabLeft, tabRight, sr, ks };
}

function pathHelpers(p: string[]) {
  return {
    M: (x: number, y: number) => p.push(`M${x} ${y}`),
    L: (x: number, y: number) => p.push(`L${x} ${y}`),
    C: (
      c1x: number,
      c1y: number,
      c2x: number,
      c2y: number,
      x: number,
      y: number,
    ) => p.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`),
  };
}

function buildTopRailPaths(metrics: RailMetrics): RailPaths {
  if (metrics.width < 8 || metrics.height < 8) return EMPTY_RAIL;
  const { x0, y0, x1, y1, or, ko, tabLeft, tabRight, sr, ks } =
    railGeometry(metrics);
  const p: string[] = [];
  const { M, L, C } = pathHelpers(p);

  M(x0, y1);
  if (sr >= 1) {
    L(tabLeft - sr, y1);
    C(tabLeft - sr + ks, y1, tabLeft, y1 - sr + ks, tabLeft, y1 - sr);
  } else {
    L(tabLeft, y1);
  }
  if (y1 - sr > y0 + or + 0.25) L(tabLeft, y0 + or);
  C(tabLeft, y0 + or - ko, tabLeft + or - ko, y0, tabLeft + or, y0);
  L(tabRight - or, y0);
  C(tabRight - or + ko, y0, tabRight, y0 + or - ko, tabRight, y0 + or);
  if (sr >= 1) {
    if (y1 - sr > y0 + or + 0.25) L(tabRight, y1 - sr);
    C(tabRight, y1 - sr + ks, tabRight + sr - ks, y1, tabRight + sr, y1);
  } else {
    L(tabRight, y1);
  }
  L(x1, y1);
  const stroke = p.join(" ");

  p.length = 0;
  if (sr >= 1) {
    M(tabLeft - sr, y1);
    C(tabLeft - sr + ks, y1, tabLeft, y1 - sr + ks, tabLeft, y1 - sr);
  } else {
    M(tabLeft, y1);
  }
  if (y1 - sr > y0 + or + 0.25) L(tabLeft, y0 + or);
  C(tabLeft, y0 + or - ko, tabLeft + or - ko, y0, tabLeft + or, y0);
  L(tabRight - or, y0);
  C(tabRight - or + ko, y0, tabRight, y0 + or - ko, tabRight, y0 + or);
  if (sr >= 1) {
    if (y1 - sr > y0 + or + 0.25) L(tabRight, y1 - sr);
    C(tabRight, y1 - sr + ks, tabRight + sr - ks, y1, tabRight + sr, y1);
  } else {
    L(tabRight, y1);
  }
  p.push("Z");
  return { stroke, fills: [p.join(" ")] };
}

function buildBottomRailPaths(metrics: RailMetrics): RailPaths {
  if (metrics.width < 8 || metrics.height < 8) return EMPTY_RAIL;
  const { x0, y0, x1, y1, or, ko, tabLeft, tabRight, sr, ks } =
    railGeometry(metrics);
  const p: string[] = [];
  const { M, L, C } = pathHelpers(p);

  M(x0, y0);
  if (sr >= 1) {
    L(tabLeft - sr, y0);
    C(tabLeft - sr + ks, y0, tabLeft, y0 + sr - ks, tabLeft, y0 + sr);
  } else {
    L(tabLeft, y0);
  }
  if (y0 + sr < y1 - or - 0.25) L(tabLeft, y1 - or);
  C(tabLeft, y1 - or + ko, tabLeft + or - ko, y1, tabLeft + or, y1);
  L(tabRight - or, y1);
  C(tabRight - or + ko, y1, tabRight, y1 - or + ko, tabRight, y1 - or);
  if (sr >= 1) {
    if (y0 + sr < y1 - or - 0.25) L(tabRight, y0 + sr);
    C(tabRight, y0 + sr - ks, tabRight + sr - ks, y0, tabRight + sr, y0);
  } else {
    L(tabRight, y0);
  }
  L(x1, y0);
  const stroke = p.join(" ");

  p.length = 0;
  if (sr >= 1) {
    M(tabLeft - sr, y0);
    C(tabLeft - sr + ks, y0, tabLeft, y0 + sr - ks, tabLeft, y0 + sr);
  } else {
    M(tabLeft, y0);
  }
  if (y0 + sr < y1 - or - 0.25) L(tabLeft, y1 - or);
  C(tabLeft, y1 - or + ko, tabLeft + or - ko, y1, tabLeft + or, y1);
  L(tabRight - or, y1);
  C(tabRight - or + ko, y1, tabRight, y1 - or + ko, tabRight, y1 - or);
  if (sr >= 1) {
    if (y0 + sr < y1 - or - 0.25) L(tabRight, y0 + sr);
    C(tabRight, y0 + sr - ks, tabRight + sr - ks, y0, tabRight + sr, y0);
  } else {
    L(tabRight, y0);
  }
  p.push("Z");
  return { stroke, fills: [p.join(" ")] };
}

/** Left/right tabs sitting on a full-width line (the "border below"). */
function buildTopEdgeRailPaths(metrics: RailMetrics): RailPaths {
  if (metrics.width < 8 || metrics.height < 8) return EMPTY_RAIL;

  const inset = 0.5;
  const x0 = inset;
  const y0 = inset;
  const x1 = widthInset(metrics.width);
  const y1 = metrics.height - inset;
  const or = OUTER_R;
  const ko = KAPPA * or;
  const hasLeft = metrics.leftTabWidth > 0;
  const hasRight = metrics.rightTabWidth > 0;
  const leftW = hasLeft ? Math.max(metrics.leftTabWidth, or * 2 + 8) : 0;
  const rightW = hasRight ? Math.max(metrics.rightTabWidth, or * 2 + 8) : 0;
  const tabY = y1;
  const sr = Math.min(STEP_R, Math.max(8, tabY - or));
  const ks = KAPPA * sr;
  const stepStartY = tabY - sr;
  const fills: string[] = [];

  const p: string[] = [];
  const { M, L, C } = pathHelpers(p);

  if (hasLeft) {
    M(x0, tabY);
    L(x0, y0 + or);
    C(x0, y0 + or - ko, x0 + or - ko, y0, x0 + or, y0);
    L(x0 + leftW - or, y0);
    C(x0 + leftW - or + ko, y0, x0 + leftW, y0 + or - ko, x0 + leftW, y0 + or);
    if (y0 + or < stepStartY - 0.25) L(x0 + leftW, stepStartY);
    C(
      x0 + leftW,
      stepStartY + ks,
      x0 + leftW + sr - ks,
      tabY,
      x0 + leftW + sr,
      tabY,
    );
  } else {
    M(x0, tabY);
  }

  if (hasRight) {
    L(x1 - rightW - sr, tabY);
    C(
      x1 - rightW - sr + ks,
      tabY,
      x1 - rightW,
      stepStartY + ks,
      x1 - rightW,
      stepStartY,
    );
    if (y0 + or < stepStartY - 0.25) L(x1 - rightW, y0 + or);
    C(x1 - rightW, y0 + or - ko, x1 - rightW + or - ko, y0, x1 - rightW + or, y0);
    L(x1 - or, y0);
    C(x1 - or + ko, y0, x1, y0 + or - ko, x1, y0 + or);
    L(x1, tabY);
  } else {
    L(x1, tabY);
  }

  const stroke = p.join(" ");

  if (hasLeft) {
    const f: string[] = [];
    const h = pathHelpers(f);
    h.M(x0, tabY);
    h.L(x0 + leftW + sr, tabY);
    h.C(
      x0 + leftW + sr - ks,
      tabY,
      x0 + leftW,
      stepStartY + ks,
      x0 + leftW,
      stepStartY,
    );
    if (y0 + or < stepStartY - 0.25) h.L(x0 + leftW, y0 + or);
    h.C(
      x0 + leftW,
      y0 + or - ko,
      x0 + leftW - or + ko,
      y0,
      x0 + leftW - or,
      y0,
    );
    h.L(x0 + or, y0);
    h.C(x0 + or - ko, y0, x0, y0 + or - ko, x0, y0 + or);
    f.push("Z");
    fills.push(f.join(" "));
  }

  if (hasRight) {
    const f: string[] = [];
    const h = pathHelpers(f);
    h.M(x1 - rightW - sr, tabY);
    h.C(
      x1 - rightW - sr + ks,
      tabY,
      x1 - rightW,
      stepStartY + ks,
      x1 - rightW,
      stepStartY,
    );
    if (y0 + or < stepStartY - 0.25) h.L(x1 - rightW, y0 + or);
    h.C(
      x1 - rightW,
      y0 + or - ko,
      x1 - rightW + or - ko,
      y0,
      x1 - rightW + or,
      y0,
    );
    h.L(x1 - or, y0);
    h.C(x1 - or + ko, y0, x1, y0 + or - ko, x1, y0 + or);
    h.L(x1, tabY);
    f.push("Z");
    fills.push(f.join(" "));
  }

  return { stroke, fills };
}

function widthInset(width: number) {
  return width - 0.5;
}

/** Hanging tab on a single connecting line — no side or body borders. */
export function TabRail({
  tab,
  leftTab,
  rightTab,
  position = "top",
  fill = "var(--background)",
  className,
}: {
  tab?: ReactNode;
  leftTab?: ReactNode;
  rightTab?: ReactNode;
  position?: "top" | "bottom";
  /** Fill behind the tab. Defaults to the page background. */
  fill?: string;
  className?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const leftTabRef = useRef<HTMLDivElement>(null);
  const rightTabRef = useRef<HTMLDivElement>(null);
  const hasCenter = Boolean(tab) && !leftTab && !rightTab;
  const hasLeft = Boolean(leftTab);
  const hasRight = Boolean(rightTab);
  const [metrics, setMetrics] = useState<RailMetrics>({
    width: 0,
    height: 0,
    tabWidth: 0,
    leftTabWidth: 0,
    rightTabWidth: 0,
  });

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      setMetrics({
        width: rail.offsetWidth,
        height: rail.offsetHeight,
        tabWidth: tabRef.current?.offsetWidth ?? 0,
        leftTabWidth: leftTabRef.current?.offsetWidth ?? 0,
        rightTabWidth: rightTabRef.current?.offsetWidth ?? 0,
      });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    if (tabRef.current) ro.observe(tabRef.current);
    if (leftTabRef.current) ro.observe(leftTabRef.current);
    if (rightTabRef.current) ro.observe(rightTabRef.current);
    measure();
    return () => ro.disconnect();
  }, [hasCenter, hasLeft, hasRight]);

  const paths = useMemo(() => {
    if (metrics.leftTabWidth > 0 || metrics.rightTabWidth > 0) {
      return buildTopEdgeRailPaths(metrics);
    }
    return position === "bottom"
      ? buildBottomRailPaths(metrics)
      : buildTopRailPaths(metrics);
  }, [metrics, position]);

  return (
    <div ref={railRef} className={cn("relative", className)}>
      {paths.stroke ? (
        <svg
          aria-hidden
          width={metrics.width}
          height={metrics.height}
          viewBox={`0 0 ${metrics.width} ${metrics.height}`}
          className="pointer-events-none absolute inset-0"
          shapeRendering="geometricPrecision"
        >
          {paths.fills.map((d) => (
            <path key={d} d={d} className="stroke-none" style={{ fill }} />
          ))}
          <path
            d={paths.stroke}
            className="fill-none stroke-border"
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      {hasCenter ? (
        <div
          ref={tabRef}
          className="relative mx-auto w-[calc(100%-2.5rem)] max-w-full"
        >
          {tab}
        </div>
      ) : (
        <div
          className={cn(
            "relative flex items-stretch",
            hasLeft && hasRight ? "justify-between" : hasRight ? "justify-end" : "justify-start",
          )}
        >
          {hasLeft ? (
            <div ref={leftTabRef} className="shrink-0">
              {leftTab}
            </div>
          ) : null}
          {hasRight ? (
            <div ref={rightTabRef} className="shrink-0">
              {rightTab}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
