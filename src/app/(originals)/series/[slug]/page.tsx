import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Eye } from "lucide-react";
import { CommentSection } from "@/components/comments";
import {
  BookmarkButton,
  ChapterList,
  ChapterOrderToggle,
  NovelCover,
  NovelDescription,
  ScrollingTags,
} from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { StarRating } from "@/components/reviews";
import { Badge } from "@/components/ui/badge";
import { chapterHref } from "@/lib/catalog-paths";
import {
  getChapterListItems,
  getNovel,
  getNovelRatingSummary,
  isNovelBookmarked,
  isUserAuthenticated,
} from "@/lib/data";
import { getNovelPageViews } from "@/lib/google-analytics";
import { creatorPublicOrigin, originalsPublicUrl } from "@/lib/hosts";
import { isOriginalNovel } from "@/lib/originals-data";
import { novelDescription } from "@/lib/seo";

const statusLabel = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel || !isOriginalNovel(novel)) {
    return {
      title: "Series not found",
      robots: { index: false, follow: false },
    };
  }

  const path = `/series/${novel.slug}`;
  return {
    title: `${novel.title} - Original Series`,
    description: novelDescription(novel),
    alternates: { canonical: originalsPublicUrl(path) },
  };
}

export default async function OriginalsSeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [novel, chapters, bookmarked, isLoggedIn] = await Promise.all([
    getNovel(slug),
    getChapterListItems(slug),
    isNovelBookmarked(slug),
    isUserAuthenticated(),
  ]);

  if (!novel || !isOriginalNovel(novel)) notFound();

  const [viewCount, rating] = await Promise.all([
    getNovelPageViews(slug),
    getNovelRatingSummary(slug),
  ]);
  const firstChapter = chapters[0];

  const ratingDisplay =
    rating.count > 0 ? (
      <span className="inline-flex items-center gap-1.5">
        <StarRating value={rating.average} starClassName="size-3.5" />
        {rating.average.toFixed(1)} ({rating.count})
      </span>
    ) : null;

  const authorLine = (
    <p className="text-sm text-muted">
      Written by{" "}
      {novel.translatorUsername ? (
        <a
          href={creatorPublicOrigin(novel.translatorUsername)}
          className="font-medium underline underline-offset-2 hover:text-accent"
        >
          {novel.translator || novel.author}
        </a>
      ) : (
        <span className="font-medium text-foreground">
          {novel.translator || novel.author}
        </span>
      )}
    </p>
  );

  const statusAndGenres = (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <Badge className="border-accent/30 text-accent">Original</Badge>
      <Badge className="border-accent/30 text-accent">
        {statusLabel[novel.status]}
      </Badge>
      {novel.genres.map((genre) => (
        <Badge key={genre}>{genre}</Badge>
      ))}
    </div>
  );

  const supportLinks =
    novel.translatorKofiUrl || novel.translatorPatreonUrl ? (
      <div className="flex flex-wrap gap-2">
        {novel.translatorKofiUrl ? (
          <a
            href={novel.translatorKofiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Support on Ko-fi
          </a>
        ) : null}
        {novel.translatorPatreonUrl ? (
          <a
            href={novel.translatorPatreonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Support on Patreon
          </a>
        ) : null}
      </div>
    ) : null;

  const actionButtons = (
    <>
      {firstChapter ? (
        <Link
          href={chapterHref(novel.slug, firstChapter.number, "series")}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <BookOpen className="size-4" strokeWidth={1.75} aria-hidden />
          Start reading
        </Link>
      ) : null}
      <BookmarkButton
        novelSlug={novel.slug}
        initialBookmarked={bookmarked}
        isLoggedIn={isLoggedIn}
      />
    </>
  );

  return (
    <PageContainer as="article" width="prose" className="pt-4 sm:pt-6 lg:pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <h1 className="text-xl font-bold tracking-tight text-balance text-foreground sm:hidden">
          {novel.title}
        </h1>

        <div className="flex flex-col gap-2 sm:w-40 sm:shrink-0 sm:gap-2">
          <div className="flex items-start gap-4 sm:flex-col sm:gap-2">
            <NovelCover
              title={novel.title}
              slug={novel.slug}
              coverUrl={novel.coverUrl}
              genres={novel.genres}
              className="w-28 shrink-0 sm:w-full"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:hidden">
              {authorLine}
              {statusAndGenres}
              <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" strokeWidth={1.75} aria-hidden />
                  {viewCount.toLocaleString()} views
                </span>
                {ratingDisplay}
              </p>
            </div>
          </div>
          <ScrollingTags tags={novel.tags} />
          <div className="mt-1 hidden w-full flex-col gap-3 sm:flex">
            {actionButtons}
            {supportLinks}
          </div>
        </div>

        <div className="-mt-2 flex min-w-0 flex-1 flex-col sm:mt-0">
          <h1 className="hidden text-3xl font-bold tracking-tight text-balance text-foreground sm:block">
            {novel.title}
          </h1>
          <div className="mt-1 hidden flex-col gap-4 sm:flex">
            {authorLine}
            {statusAndGenres}
            <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-4" strokeWidth={1.75} aria-hidden />
                {viewCount.toLocaleString()} views
              </span>
              {ratingDisplay}
            </p>
          </div>
          {novel.synopsis ? <NovelDescription synopsis={novel.synopsis} /> : null}
          <div className="mt-6 flex flex-col gap-3 sm:hidden">
            {actionButtons}
            {supportLinks}
          </div>
        </div>
      </div>

      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Chapters
            <span className="ml-2 text-sm font-normal text-muted">
              {chapters.length}
            </span>
          </h2>
          {chapters.length > 0 ? <ChapterOrderToggle /> : null}
        </div>
        <ChapterList
          slug={novel.slug}
          chapters={chapters}
          catalogBase="series"
          hideLockBadges
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Comments
        </h2>
        <CommentSection mode="novel" novelSlug={novel.slug} />
      </section>
    </PageContainer>
  );
}
