import type { Metadata } from "next";
import { Bookmark, Coins, Eye, ShoppingCart } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";

export const metadata: Metadata = {
  title: "Admin — Dashboard",
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

export default async function DashboardPage() {
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
  const [viewsRes, bookmarksRes, unlocksRes] =
    novelIds.length === 0
      ? [{ data: [] }, { data: [] }, { data: [] }]
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
        <SummaryCard icon={<Coins className="size-4" />} label="Coins earned" value={totals.coinsEarned} />
      </div>

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
                <th className="px-4 py-3 text-right font-medium">Coins</th>
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
                        {formatCoins(earned)} coins
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
