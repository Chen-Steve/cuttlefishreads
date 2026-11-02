import type { Metadata } from "next";
import { Suspense } from "react";
import { NovelsBrowser } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getNovels } from "@/lib/data";
import { toNovelCardData } from "@/lib/novel-card-data";
import { parseNovelsBrowseParams } from "@/lib/novels-browse";
import { publicPageMetadata } from "@/lib/seo";
import type { NovelCardData } from "@/types";

export const metadata: Metadata = publicPageMetadata({
  title: "All Novels",
  description: "Novels on Cuttlefish.",
  path: "/novels",
});

export default async function NovelsPage({
  searchParams,
}: PageProps<"/novels">) {
  const catalog = await getNovels();
  const novels = catalog.map(toNovelCardData);
  const viewsBySlug = Object.fromEntries(
    catalog.map((novel) => [novel.slug, novel.viewCount ?? 0]),
  );

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12">
      <Suspense fallback={
        <NovelsBrowser novels={novels} viewsBySlug={viewsBySlug} initialFilters={parseNovelsBrowseParams({})} />
      }>
        <FilteredNovelsBrowser novels={novels} viewsBySlug={viewsBySlug} searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function FilteredNovelsBrowser({
  novels,
  viewsBySlug,
  searchParams,
}: {
  novels: NovelCardData[];
  viewsBySlug: Record<string, number>;
  searchParams: PageProps<"/novels">["searchParams"];
}) {
  // Query-specific filters stream separately from the prerendered catalog.
  const params = await searchParams;
  return <NovelsBrowser novels={novels} viewsBySlug={viewsBySlug} initialFilters={parseNovelsBrowseParams(params)} />;
}
