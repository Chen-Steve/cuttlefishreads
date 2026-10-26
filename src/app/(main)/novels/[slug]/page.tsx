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
import { COVER_SIZES_DETAIL } from "@/components/novel/novel-cover";
import { getBulkBuyState } from "@/lib/bulk-buy";
import { PageContainer } from "@/components/page-container";
import { StarRating } from "@/components/reviews";
import { Skeleton } from "@/components/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  getChapterListItems,
  getNovel,
  getNovelRatingSummary,
  getPublicChapterListItems,
  isNovelBookmarked,
} from "@/lib/data";
import { getSessionProfile } from "@/lib/session-profile";
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

  return publicPageMetadata({
    title: novel.title,
    description: novelDescription(novel),
    path: `/novels/${novel.slug}`,
  });
}

export default async function NovelDetailPage({
  params,
}: PageProps<"/novels/[slug]">) {
  const { slug } = await params;
  const readerAccess = getChapterListItems(slug)
    .then((items) =>
      items.map(({ id, locked, adminAccess }) => ({
        id,
        locked,
        adminAccess,
      })),
    )
    .catch((error: unknown) => {
      console.error("reader chapter access:", error);
      return [];
    });
  const [novel, chapters] = await Promise.all([
    getNovel(slug),
    getPublicChapterListItems(slug),
  ]);

  if (!novel) {
    notFound();
  }

  const viewCount = novel.viewCount ?? 0;
  const firstChapter = chapters[0];

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
              sizes={COVER_SIZES_DETAIL}
              priority
              className="w-28 shrink-0 sm:w-full"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:hidden">
              {authorLine}
              {statusAndGenres}
              <NovelViewCount viewCount={viewCount} slug={novel.slug} />
            </div>
          </div>
          {/* Desktop buttons below cover */}
          <div className="mt-1 hidden w-full flex-col gap-3 sm:flex">
            <NovelActions
              slug={novel.slug}
              firstChapterNumber={firstChapter?.number}
            />
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
            <NovelViewCount viewCount={viewCount} slug={novel.slug} />
          </div>

          {novel.synopsis ? <NovelDescription synopsis={novel.synopsis} /> : null}
          <NovelTags tags={novel.tags} />

          {/* Mobile buttons */}
          <div className="mt-3 flex flex-col gap-3 sm:hidden">
            <div className="flex items-start gap-2">
              <NovelActions
                slug={novel.slug}
                firstChapterNumber={firstChapter?.number}
              />
            </div>
            {supportLinks}
          </div>
        </div>
      </div>

      <section className="mt-2">
        <Suspense fallback={null}>
          <NovelBulkBuy slug={novel.slug} />
        </Suspense>
        <ChapterList
          slug={novel.slug}
          chapters={chapters}
          readerAccess={readerAccess}
        />
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

function NovelViewCount({
  viewCount,
  slug,
}: {
  viewCount: number;
  slug: string;
}) {
  return (
    <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:text-sm">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5 shrink-0 sm:size-4" strokeWidth={1.75} aria-hidden />
        {viewCount.toLocaleString()} views
      </span>
      <Suspense fallback={null}>
        <NovelRating slug={slug} />
      </Suspense>
    </p>
  );
}

async function NovelRating({ slug }: { slug: string }) {
  const rating = await getNovelRatingSummary(slug);
  if (rating.count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <StarRating value={rating.average} starClassName="size-3.5" />
      {rating.average.toFixed(1)} ({rating.count})
    </span>
  );
}

function NovelActions({
  slug,
  firstChapterNumber,
}: {
  slug: string;
  firstChapterNumber?: number;
}) {
  return (
    <>
      {firstChapterNumber != null ? (
        <StartReadingButton
          slug={slug}
          firstChapterNumber={firstChapterNumber}
        />
      ) : null}
      <Suspense fallback={<BookmarkButtonFallback />}>
        <NovelBookmarkButton slug={slug} />
      </Suspense>
    </>
  );
}

function BookmarkButtonFallback() {
  return (
    <div className="w-auto shrink-0 sm:w-full" aria-hidden>
      <Skeleton className="h-11 w-11 rounded-xl sm:w-full" />
    </div>
  );
}

async function NovelBookmarkButton({ slug }: { slug: string }) {
  const [bookmarked, session] = await Promise.all([
    isNovelBookmarked(slug),
    getSessionProfile(),
  ]);

  return (
    <BookmarkButton
      novelSlug={slug}
      initialBookmarked={bookmarked}
      isLoggedIn={Boolean(session)}
    />
  );
}

async function NovelBulkBuy({ slug }: { slug: string }) {
  const [chapters, session] = await Promise.all([
    getChapterListItems(slug),
    getSessionProfile(),
  ]);
  if (!getBulkBuyState(chapters).eligible) return null;

  return (
    <div className="mb-2 flex justify-end">
      <BulkBuyChapters
        novelSlug={slug}
        chapters={chapters}
        userCoins={session?.coins ?? 0}
        isLoggedIn={Boolean(session)}
      />
    </div>
  );
}
