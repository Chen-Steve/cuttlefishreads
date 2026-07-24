import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Feather } from "lucide-react";
import { HomeSection } from "@/components/home-section";
import {
  NovelCarousel,
  PaginatedRecentlyUpdatedList,
} from "@/components/novel";
import { OriginalsHero } from "@/components/originals/originals-hero";
import { PageContainer } from "@/components/page-container";
import { ORIGINALS } from "@/lib/constants";
import { getOriginalsHomeData } from "@/lib/originals-data";
import { originalsPageMetadata } from "@/lib/seo";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = originalsPageMetadata({
  title: ORIGINALS.name,
  description: ORIGINALS.seoDescription,
  path: "/",
});

export default async function OriginalsHomePage() {
  const workspaceHref = "/workspace";
  const signupHref = `/signup?redirect=${encodeURIComponent(workspaceHref)}`;
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { featured, newlyAdded, recentlyUpdated, completed, catalog } =
    await getOriginalsHomeData();
  const isEmpty = catalog.length === 0;

  return (
    <PageContainer className="pt-3 pb-6 sm:py-8 lg:py-10">
      <OriginalsHero
        isAuthenticated={isAuthenticated}
        workspaceHref={workspaceHref}
        signupHref={signupHref}
      />

      {isEmpty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/60 px-5 py-14 text-center">
          <Feather
            className="mx-auto size-8 text-accent"
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Originals is warming up
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Be the first to publish — create an account and start writing from
            your author workspace.
          </p>
        </div>
      ) : (
        <>
          <HomeSection
            title="Featured"
            storageKey="cf-originals-featured"
            href="/browse"
            linkLabel="View all"
            className="mt-6 sm:mt-8"
          >
            <NovelCarousel
              novels={featured}
              dense
              fillRow
              showChapterCount
              catalogBase="series"
              emptyLabel="No featured originals yet."
            />
          </HomeSection>

          <HomeSection
            title="Newly added"
            storageKey="cf-originals-newly-added"
            href="/browse"
            linkLabel="View all"
          >
            <NovelCarousel
              novels={newlyAdded}
              dense
              fillRow
              showChapterCount
              catalogBase="series"
              emptyLabel="No new originals yet."
            />
          </HomeSection>

          <HomeSection
            title="Recently updated"
            storageKey="cf-originals-recently-updated"
            href="/latest"
            linkLabel="View all"
          >
            <PaginatedRecentlyUpdatedList
              novels={recentlyUpdated}
              pageSize={6}
              catalogBase="series"
            />
          </HomeSection>

          {completed.length > 0 ? (
            <HomeSection
              title="Completed"
              storageKey="cf-originals-completed"
              href="/browse"
              linkLabel="View all"
            >
              <NovelCarousel
                novels={completed}
                dense
                fillRow
                showChapterCount
                catalogBase="series"
              />
            </HomeSection>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
