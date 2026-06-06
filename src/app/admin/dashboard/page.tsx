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
            .select("novel_slug, coins_spent")
            .in("novel_slug", slugs),
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

  const purchasesBySlug = new Map<string, number>();
  const coinsBySlug = new Map<string, number>();
  for (const row of (unlocksRes.data ?? []) as {
    novel_slug: string;
    coins_spent: number;
  }[]) {
    purchasesBySlug.set(
      row.novel_slug,
      (purchasesBySlug.get(row.novel_slug) ?? 0) + 1,
    );
    coinsBySlug.set(
      row.novel_slug,
      (coinsBySlug.get(row.novel_slug) ?? 0) + row.coins_spent,
    );
  }

  const stats: NovelStat[] = rows.map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    views: viewsByNovel.get(n.id) ?? 0,
    bookmarks: bookmarksByNovel.get(n.id) ?? 0,
    purchases: purchasesBySlug.get(n.slug) ?? 0,
    coinsEarned: coinsBySlug.get(n.slug) ?? 0,
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
                    {s.coinsEarned.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
        {value.toLocaleString()}
      </p>
    </div>
  );
}
