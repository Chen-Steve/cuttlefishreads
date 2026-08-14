import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Coffee, Eye, Heart } from "lucide-react";
import { CommentSection, CommentsFallback } from "@/components/comments";
import {
  BookmarkButton,
  BulkBuyChapters,
  ChapterList,
  NovelCover,
  MobileNovelTitle,
  NovelDescription,
  NovelTags,
  StartReadingButton,
} from "@/components/novel";
import { getBulkBuyState } from "@/lib/bulk-buy";
import { PageContainer } from "@/components/page-container";
import { StarRating } from "@/components/reviews";
import { Badge } from "@/components/ui/badge";
import {
  getChapterListItems,
  getNovel,
  getNovelRatingSummary,
  getUserCoins,
  isNovelBookmarked,
  isUserAuthenticated,
} from "@/lib/data";
import { getNovelPageViews } from "@/lib/google-analytics";
import { publicPageMetadata, novelDescription } from "@/lib/seo";

const statusLabel = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
} as const;

export async function generateMetadata({
  params,
}: PageProps<"/novels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel) {
    return {
      title: "Novel not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = novelDescription(novel);
  const path = `/novels/${novel.slug}`;

  return {
    ...publicPageMetadata({
      title: `${novel.title} - Read Chapters Online`,
      description,
      path,
    }),
    alternates: {
      canonical: path,
      types: {
        "application/rss+xml": [
          { url: `${path}/feed.xml`, title: `${novel.title} updates` },
        ],
      },
    },
  };
}

export default async function NovelDetailPage({
  params,
}: PageProps<"/novels/[slug]">) {
  const { slug } = await params;
  const [novel, chapters, bookmarked, isLoggedIn, userCoins, viewCount, rating] =
    await Promise.all([
      getNovel(slug),
      getChapterListItems(slug),
      isNovelBookmarked(slug),
      isUserAuthenticated(),
      getUserCoins(),
      getNovelPageViews(slug),
      getNovelRatingSummary(slug),
    ]);

  if (!novel) {
    notFound();
  }

  const firstChapter = chapters[0];
  const bulkBuy = getBulkBuyState(chapters);

  const authorLine =
    novel.translator || novel.originalAuthor ? (
      <p className="text-sm text-muted">
        {novel.translator ? (
          <>
            by{" "}
            {novel.translatorUsername ? (
              <Link
                href={`/u/${novel.translatorUsername}`}
                className="font-medium underline underline-offset-2 hover:text-accent"
              >
                {novel.translator}
              </Link>
            ) : (
              novel.translator
            )}
          </>
        ) : null}
        {novel.translator && novel.originalAuthor ? " · " : null}
        {novel.originalAuthor ? `Original by ${novel.originalAuthor}` : null}
        {novel.novelupdatesUrl ? (
          <>
            {", "}
            <a
              href={novel.novelupdatesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium  underline underline-offset-2 hover:text-accent"
            >
              novelupdates
            </a>
          </>
        ) : null}
      </p>
    ) : (
      <p className="text-sm text-muted">by {novel.author}</p>
    );

  const statusAndGenres = (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <Badge className="border-accent/30 text-accent">
        {statusLabel[novel.status]}
      </Badge>
      <Badge>{novel.language}</Badge>
      {novel.genres.map((genre) => (
        <Badge key={genre}>{genre}</Badge>
      ))}
    </div>
  );

  const viewCountDisplay = (
    <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:text-sm">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5 shrink-0 sm:size-4" strokeWidth={1.75} aria-hidden />
        {viewCount.toLocaleString()} views
      </span>
      {rating.count > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <StarRating value={rating.average} starClassName="size-3.5" />
          {rating.average.toFixed(1)} ({rating.count})
        </span>
      ) : null}
    </p>
  );

  const actionButtons = (
    <>
      {firstChapter ? (
        <StartReadingButton
          slug={novel.slug}
          firstChapterNumber={firstChapter.number}
          chapterCount={novel.chapterCount}
        />
      ) : null}
      <BookmarkButton
        novelSlug={novel.slug}
        initialBookmarked={bookmarked}
        isLoggedIn={isLoggedIn}
      />
    </>
  );

  const supportLinks =
    novel.translatorKofiUrl || novel.translatorPatreonUrl ? (
      <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
        {novel.translatorKofiUrl ? (
          <a
            href={novel.translatorKofiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#13C3FF] px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Coffee className="size-3.5" strokeWidth={2} aria-hidden />
            Ko-fi
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
        {novel.translatorPatreonUrl ? (
          <a
            href={novel.translatorPatreonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#FF424D] px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Heart className="size-3.5" strokeWidth={2} aria-hidden />
            Patreon
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    ) : null;

  return (
    <PageContainer as="article" width="prose" className="pt-4 sm:pt-6 lg:pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        {/* Left column: title (mobile) + cover + buttons (desktop) */}
        <div className="flex flex-col gap-1 sm:w-40 sm:shrink-0 sm:gap-2">
          <MobileNovelTitle title={novel.title} />

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
              {viewCountDisplay}
            </div>
          </div>
          {/* Desktop buttons below cover */}
          <div className="mt-1 hidden w-full flex-col gap-3 sm:flex">
            {actionButtons}
            {supportLinks}
          </div>
        </div>

        {/* Right column: title, meta, synopsis, mobile buttons */}
        <div className="-mt-2 flex min-w-0 flex-1 flex-col sm:mt-0">
          <h1 className="hidden text-3xl font-bold tracking-tight text-balance text-foreground sm:block">
            {novel.title}
          </h1>

          <div className="mt-1 hidden flex-col gap-4 sm:flex">
            {authorLine}
            {statusAndGenres}
            {viewCountDisplay}
          </div>

          {novel.synopsis ? <NovelDescription synopsis={novel.synopsis} /> : null}
          <NovelTags tags={novel.tags} />

          {/* Mobile buttons */}
          <div className="mt-3 flex flex-col gap-3 sm:hidden">
            <div className="flex items-start gap-2">
              {actionButtons}
            </div>
            {supportLinks}
          </div>
        </div>
      </div>

      <section className="mt-2">
        {bulkBuy.eligible ? (
          <div className="mb-2 flex justify-end">
            <BulkBuyChapters
              novelSlug={novel.slug}
              chapters={chapters}
              userCoins={userCoins}
              isLoggedIn={isLoggedIn}
            />
          </div>
        ) : null}
        <ChapterList slug={novel.slug} chapters={chapters} />
      </section>

      <section className="mt-4" aria-label="Comments">
        <Suspense fallback={<CommentsFallback />}>
          <CommentSection
            mode="novel"
            novelSlug={novel.slug}
            chapterTitles={Object.fromEntries(
              chapters.map((c) => [
                c.number,
                c.title || `Chapter ${c.number}`,
              ]),
            )}
          />
        </Suspense>
      </section>
    </PageContainer>
  );
}
