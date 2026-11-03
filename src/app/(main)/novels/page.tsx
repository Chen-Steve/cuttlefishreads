import type { Metadata } from "next";
import { Suspense } from "react";
import {
  NovelsBrowser,
  NovelsBrowseFilterState,
} from "@/components/novel/novels-browser";
import { PageContainer } from "@/components/page-container";
import { getNovels } from "@/lib/data";
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
  const catalog = await getNovels();
  const novels = catalog.map(toNovelCardData);
  const viewsBySlug = Object.fromEntries(
    catalog.map((novel) => [novel.slug, novel.viewCount ?? 0]),
  );

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12">
      <NovelsBrowser novels={novels} viewsBySlug={viewsBySlug}>
        <Suspense fallback={null}>
          <NovelsBrowseQuery searchParams={searchParams} />
        </Suspense>
      </NovelsBrowser>
    </PageContainer>
  );
}

async function NovelsBrowseQuery({
  searchParams,
}: {
  searchParams: PageProps<"/novels">["searchParams"];
}) {
  const params = await searchParams;
  return <NovelsBrowseFilterState filters={parseNovelsBrowseParams(params)} />;
}
