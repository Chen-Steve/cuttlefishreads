import type { Metadata } from "next";
import { NovelsBrowser } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getNovels } from "@/lib/data";
import { getAllTimeViewsBySlug } from "@/lib/google-analytics";
import { toNovelCardData } from "@/lib/novel-card-data";
import { parseNovelsBrowseParams } from "@/lib/novels-browse";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "All Novels",
  description: "Novels on Cuttlefish.",
  path: "/novels",
});

export default async function NovelsPage({
  searchParams,
}: PageProps<"/novels">) {
  const params = await searchParams;
  const catalog = await getNovels();
  const viewsBySlug = await getAllTimeViewsBySlug(catalog.map((novel) => novel.slug));

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12">
      <NovelsBrowser
        novels={catalog.map(toNovelCardData)}
        viewsBySlug={viewsBySlug}
        initialFilters={parseNovelsBrowseParams(params)}
      />
    </PageContainer>
  );
}
