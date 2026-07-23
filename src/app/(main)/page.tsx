import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Library } from "lucide-react";
import { DiscordIcon } from "@/components/discord-icon";
import { HomeSection } from "@/components/home-section";
import {
  ContinueReadingSection,
  NovelCarousel,
  PaginatedRecentlyUpdatedList,
} from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import {
  getCompletedNovels,
  getFeaturedNovels,
  getNewlyAddedNovels,
  getNovels,
  getRecentlyUpdatedNovels,
  getUnderratedNovels,
} from "@/lib/data";
import { SITE } from "@/lib/constants";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Home",
  description: SITE.seoDescription,
  path: "/",
});

export default async function Home() {
  const [catalog, newlyAdded, recentlyUpdated] = await Promise.all([
    getNovels(),
    getNewlyAddedNovels(),
    getRecentlyUpdatedNovels(),
  ]);
  const featured = await getFeaturedNovels(catalog);
  const [underrated, completed] = await Promise.all([
    getUnderratedNovels(
      [
        ...featured.map((novel) => novel.slug),
        ...newlyAdded.map((novel) => novel.slug),
      ],
      undefined,
      catalog,
    ),
    getCompletedNovels(catalog),
  ]);

  return (
    <PageContainer className="pt-3 pb-6 sm:py-8 lg:py-10">
      <h1 className="sr-only sm:hidden">{SITE.name}</h1>
      <section className="relative hidden overflow-hidden rounded-xl border border-border bg-surface px-4 py-6 sm:block sm:px-8 sm:py-9">
        <span className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(135deg,transparent,transparent_14px,var(--accent)_14px,var(--accent)_15px)]" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            {SITE.name}
          </p>
          <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-balance text-foreground sm:text-3xl">
            {SITE.description}.
          </h1>
          <p className="mt-2.5 text-pretty text-sm leading-normal text-muted">
            Browse, follow your favorites,
            and pick up right where you left off.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/novels"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Browse novels
              <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
            </Link>
            <Link
              href="/library"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Library className="size-3.5" strokeWidth={1.75} aria-hidden />
              My library
            </Link>
            <a
              href={SITE.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <DiscordIcon className="size-3.5" />
              Discord
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </section>

      <ContinueReadingSection novels={catalog} className="mt-0 sm:mt-5" />

      <HomeSection
        title="Featured"
        storageKey="cf-home-section-featured"
        href="/novels"
        linkLabel="View all"
        className="mt-4 sm:mt-5 peer-[:empty]/continue:mt-0"
      >
        <NovelCarousel novels={featured} dense fillRow showChapterCount />
      </HomeSection>

      <HomeSection
        title="Newly added"
        storageKey="cf-home-section-newly-added"
        href="/novels"
        linkLabel="View all"
      >
        <NovelCarousel novels={newlyAdded} dense fillRow showChapterCount />
      </HomeSection>

      {underrated.length > 0 ? (
        <HomeSection
          title="Underrated"
          storageKey="cf-home-section-underrated"
          href="/novels"
          linkLabel="View all"
        >
          <NovelCarousel novels={underrated} dense fillRow showChapterCount />
        </HomeSection>
      ) : null}

      <HomeSection
        title="Recently updated"
        storageKey="cf-home-section-recently-updated"
      >
        <PaginatedRecentlyUpdatedList novels={recentlyUpdated} pageSize={8} />
      </HomeSection>

      {completed.length > 0 ? (
        <HomeSection
          title="Completed"
          storageKey="cf-home-section-completed"
          href="/novels"
          linkLabel="View all"
        >
          <NovelCarousel novels={completed} dense fillRow showChapterCount />
        </HomeSection>
      ) : null}
    </PageContainer>
  );
}
