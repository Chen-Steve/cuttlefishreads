import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BookOpen, Eye } from "lucide-react";
import { CommentSection } from "@/components/comments";
import {
  BookmarkButton,
  BulkBuyChapters,
  BulkBuyInfo,
  ChapterList,
  ChapterOrderToggle,
  NovelCover,
  NovelDescription,
  ScrollingTags,
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
import { originalsPublicUrl } from "@/lib/hosts";
import { isOriginalNovel } from "@/lib/originals-data";
import { novelDescription } from "@/lib/seo";

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
  if (isOriginalNovel(novel)) {
    return {
      title: `${novel.title} - Original Series`,
      description: novelDescription(novel),
      alternates: {
        canonical: originalsPublicUrl(`/series/${novel.slug}`),
      },
    };
  }

  const description = novelDescription(novel);
  const path = `/novels/${novel.slug}`;

  return {
    title: `${novel.title} - Read Chapters Online`,
    description,
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
  const [novel, chapters, bookmarked, isLoggedIn, userCoins] = await Promise.all([
    getNovel(slug),
    getChapterListItems(slug),
    isNovelBookmarked(slug),
    isUserAuthenticated(),
    getUserCoins(),
  ]);

  if (!novel) {
    notFound();
  }
  if (isOriginalNovel(novel)) {
    permanentRedirect(originalsPublicUrl(`/series/${novel.slug}`));
  }

  const [viewCount, rating] = await Promise.all([
    getNovelPageViews(slug),
    getNovelRatingSummary(slug),
  ]);

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
        <Link
          href={`/novels/${novel.slug}/${firstChapter.number}`}
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

        {/* Left column: cover + tags + buttons (desktop) */}
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
              {viewCountDisplay}
            </div>
          </div>
          <ScrollingTags tags={novel.tags} />
          {/* Desktop buttons below cover */}
          <div className="mt-1 hidden w-full flex-col gap-3 sm:flex">
            {actionButtons}
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

          {/* Mobile buttons */}
          <div className="mt-6 flex flex-col gap-3 sm:hidden">
            {actionButtons}
          </div>
        </div>
      </div>

      <section className="mt-4">
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Chapters:
              <span className="ml-2 text-sm font-normal text-muted">
                {chapters.length}
              </span>
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              {bulkBuy.eligible ? (
                <div className="hidden sm:contents">
                  <BulkBuyChapters
                    novelSlug={novel.slug}
                    chapters={chapters}
                    userCoins={userCoins}
                    isLoggedIn={isLoggedIn}
                  />
                </div>
              ) : null}
              {chapters.length > 0 ? <ChapterOrderToggle /> : null}
            </div>
          </div>
          {bulkBuy.eligible ? (
            <div className="flex justify-end sm:hidden">
              <BulkBuyChapters
                novelSlug={novel.slug}
                chapters={chapters}
                userCoins={userCoins}
                isLoggedIn={isLoggedIn}
              />
            </div>
          ) : null}
        </div>
        <ChapterList slug={novel.slug} chapters={chapters} />
        {!bulkBuy.eligible ? (
          <div className="mt-4">
            <BulkBuyInfo />
          </div>
        ) : null}
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
