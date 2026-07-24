import type { Metadata } from "next";
import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getOriginalsCatalog } from "@/lib/originals-data";
import { originalsPageMetadata } from "@/lib/seo";
import type { Novel } from "@/types";

export const metadata: Metadata = originalsPageMetadata({
  title: "Browse Originals",
  description: "Browse every original series on Cuttlefish Originals.",
  path: "/browse",
});

function filterOriginals(novels: Novel[], query: string): Novel[] {
  const q = query.trim().toLowerCase();
  if (!q) return novels;

  return novels.filter((novel) => {
    const haystack = [
      novel.title,
      novel.author,
      novel.originalAuthor ?? "",
      novel.synopsis,
      ...novel.genres,
      ...novel.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export default async function OriginalsBrowsePage({
  searchParams,
}: PageProps<"/originals/browse">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const catalog = await getOriginalsCatalog();
  const novels = filterOriginals(catalog, query);

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Originals
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {query ? "Search" : "Browse"}
            </h1>
            {query ? (
              <p className="mt-1 truncate text-sm text-muted">
                Results for{" "}
                <span className="font-medium text-foreground">
                  &ldquo;{query}&rdquo;
                </span>
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-sm text-muted tabular-nums">
            {novels.length} series
          </p>
        </div>
      </header>
      <NovelGrid novels={novels} showChapterCount catalogBase="series" />
    </PageContainer>
  );
}
