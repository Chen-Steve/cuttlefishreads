import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { PaginatedRecentlyUpdatedList } from "@/components/novel";
import { getOriginalsHomeData } from "@/lib/originals-data";
import { originalsPageMetadata } from "@/lib/seo";

export const metadata: Metadata = originalsPageMetadata({
  title: "Latest Originals",
  description: "Recently updated original series on Cuttlefish Originals.",
  path: "/latest",
});

export default async function OriginalsLatestPage() {
  const { recentlyUpdated } = await getOriginalsHomeData();

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Originals
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Latest updates
        </h1>
        <p className="mt-2 text-sm text-muted">
          Fresh chapters from original series.
        </p>
      </header>
      <PaginatedRecentlyUpdatedList
        novels={recentlyUpdated}
        pageSize={12}
        catalogBase="series"
      />
    </PageContainer>
  );
}
