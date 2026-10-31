import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeDiscoveryLinks } from "@/components/home-discovery-links";
import { HomeSection } from "@/components/home-section";
import {
  ContinueReadingSection,
  FeaturedNovels,
  NovelCarousel,
  PaginatedRecentlyUpdatedList,
} from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { LoadingStatus, Skeleton } from "@/components/skeleton";
import {
  getCompletedNovels,
  getFeaturedNovels,
  getNewlyAddedNovels,
  getNovels,
  getRecentlyUpdatedNovels,
  getUnderratedNovels,
} from "@/lib/data";
import { SITE } from "@/lib/constants";
import { toNovelCardData } from "@/lib/novel-card-data";
import { novelsBrowseHref } from "@/lib/novels-browse";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Home",
  description: SITE.seoDescription,
  path: "/",
});

export default function Home() {
  return (
    <PageContainer className="pt-2 pb-6 sm:pt-3 sm:pb-8 lg:pb-10">
      <h1 className="sr-only">{SITE.name}</h1>

      <ContinueReadingSection className="mt-0" />

      <div className="mt-3 peer-data-[state=closed]/continue:mt-2 sm:mt-4 sm:peer-data-[state=closed]/continue:mt-2">
        <Suspense fallback={<HomeCatalogFallback />}>
          <HomeCatalog />
        </Suspense>
      </div>
    </PageContainer>
  );
}

function HomeCatalogFallback() {
  return (
    <LoadingStatus label="Loading novels">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton
            key={index}
            className="aspect-[3/4] w-[7.5rem] shrink-0 rounded-lg"
          />
        ))}
      </div>
    </LoadingStatus>
  );
}

async function HomeCatalog() {
  const [catalog, recentlyUpdated] = await Promise.all([
    getNovels(),
    getRecentlyUpdatedNovels(),
  ]);

  // Section sorts are in-memory once the catalog is loaded.
  const [featured, newlyAdded, completed] = await Promise.all([
    getFeaturedNovels(catalog),
    getNewlyAddedNovels(catalog),
    getCompletedNovels(catalog),
  ]);
  const underrated = await getUnderratedNovels(
    [
      ...featured.map((novel) => novel.slug),
      ...newlyAdded.map((novel) => novel.slug),
    ],
    undefined,
    catalog,
  );

  return (
    <>
      <HomeSection
        title="Featured"
        storageKey="cf-home-section-featured"
        href={novelsBrowseHref({ sort: "views-desc" })}
        linkLabel="View all"
        className="mt-0"
        header="rail"
      >
        <FeaturedNovels novels={featured} />
      </HomeSection>

      <HomeDiscoveryLinks hasNovels={catalog.length > 0} />

      <HomeSection
        title="Newly added"
        storageKey="cf-home-section-newly-added"
        href={novelsBrowseHref({ sort: "newest" })}
        linkLabel="View all"
        header="rail"
      >
        <NovelCarousel
          novels={newlyAdded.map(toNovelCardData)}
          dense
          fillRow
          showChapterCount
        />
      </HomeSection>

      {underrated.length > 0 ? (
        <HomeSection
          title="Underrated"
          storageKey="cf-home-section-underrated"
          href={novelsBrowseHref({ sort: "views-asc" })}
          linkLabel="View all"
          header="rail"
        >
          <NovelCarousel
            novels={underrated.map(toNovelCardData)}
            dense
            fillRow
            showChapterCount
          />
        </HomeSection>
      ) : null}

      <PaginatedRecentlyUpdatedList
        novels={recentlyUpdated}
        pageSize={8}
        maxPages={5}
      />

      {completed.length > 0 ? (
        <HomeSection
          title="Completed"
          storageKey="cf-home-section-completed"
          href={novelsBrowseHref({ status: "completed" })}
          linkLabel="View all"
          header="rail"
        >
          <NovelCarousel
            novels={completed.map(toNovelCardData)}
            dense
            fillRow
            showChapterCount
          />
        </HomeSection>
      ) : null}
    </>
  );
}
