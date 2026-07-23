"use client";

import { useId, useState } from "react";
import Link from "next/link";

import type { AccountComment } from "@/lib/data";
import {
  CUSTOM_PACKAGE_ID,
  getPackageById,
  centsToAmountString,
} from "@/lib/coin-packages";
import { cn } from "@/lib/utils";
import { AccountComments } from "./account-comments";

type TabId = "purchases" | "unlocks" | "comments";

type PurchaseRow = {
  id: string;
  package_id: string;
  coins: number;
  amount_cents: number;
  created_at: string;
};

type UnlockRow = {
  id: string;
  novel_slug: string;
  chapter_number: number;
  coins_spent: number;
  created_at: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "purchases", label: "Purchases" },
  { id: "unlocks", label: "Unlocks" },
  { id: "comments", label: "Comments" },
];

function packageLabel(id: string): string {
  if (id === CUSTOM_PACKAGE_ID) return "Custom amount";
  return getPackageById(id)?.label ?? id;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AccountActivity({
  purchases,
  unlocks,
  novelTitles,
  comments,
}: {
  purchases: PurchaseRow[];
  unlocks: UnlockRow[];
  novelTitles: Record<string, string>;
  comments: AccountComment[];
}) {
  const [tab, setTab] = useState<TabId>("purchases");
  const baseId = useId();

  const counts: Record<TabId, number> = {
    purchases: purchases.length,
    unlocks: unlocks.length,
    comments: comments.length,
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Account activity"
        className="grid grid-cols-3 gap-0.5 rounded-xl border border-border bg-surface p-0.5"
      >
        {TABS.map(({ id, label }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${baseId}-${id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-1.5 sm:text-sm",
                selected
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              <span className="truncate">{label}</span>
              <span
                className={cn(
                  "tabular-nums",
                  selected ? "text-accent-foreground/75" : "text-muted/70",
                )}
              >
                {counts[id]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-purchases-panel`}
        aria-labelledby={`${baseId}-purchases`}
        hidden={tab !== "purchases"}
      >
        {purchases.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {purchases.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {packageLabel(p.package_id)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {formatDate(p.created_at)} · $
                    {centsToAmountString(p.amount_cents)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  +{p.coins.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
            No purchases yet.{" "}
            <Link
              href="/shop"
              className="font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Visit the shop
            </Link>
          </p>
        )}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-unlocks-panel`}
        aria-labelledby={`${baseId}-unlocks`}
        hidden={tab !== "unlocks"}
      >
        {unlocks.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {unlocks.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/novels/${u.novel_slug}`}
                    className="block truncate font-medium text-foreground transition-colors hover:text-accent"
                  >
                    {novelTitles[u.novel_slug] ?? u.novel_slug}
                  </Link>
                  <p className="text-[11px] text-muted">
                    {formatDate(u.created_at)} · Ch. {u.chapter_number}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  −{u.coins_spent.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
            No chapter unlocks yet.
          </p>
        )}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-comments-panel`}
        aria-labelledby={`${baseId}-comments`}
        hidden={tab !== "comments"}
      >
        <AccountComments comments={comments} hideHeading />
      </div>
    </div>
  );
}
