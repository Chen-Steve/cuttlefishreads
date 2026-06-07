import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { CommentSection } from "@/components/comments";
import {
  BookmarkButton,
  BulkBuyChapters,
  BulkBuyInfo,
  ChapterList,
  NovelCover,
  NovelDescription,
} from "@/components/novel";
import { getBulkBuyState } from "@/lib/bulk-buy";
import { PageContainer } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import {
  getChapters,
  getNovel,
  getUserCoins,
  isNovelBookmarked,
  isUserAuthenticated,
  recordNovelView,
} from "@/lib/data";
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
    openGraph: {
      title: `${novel.title} | Cuttlefish Reads`,
      description,
      url: path,
      siteName: "Cuttlefish Reads",
      type: "book",
      images: novel.coverUrl
        ? [
            {
              url: novel.coverUrl,
              alt: `${novel.title} cover`,
            },
          ]
        : [
            {
              url: "/cuttle.png",
              alt: "Cuttlefish Reads",
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${novel.title} | Cuttlefish Reads`,
      description,
      images: [novel.coverUrl ?? "/cuttle.png"],
    },
  };
}

export default async function NovelDetailPage({
  params,
}: PageProps<"/novels/[slug]">) {
  const { slug } = await params;
  const [novel, chapters, bookmarked, isLoggedIn, userCoins] = await Promise.all([
    getNovel(slug),
    getChapters(slug),
    isNovelBookmarked(slug),
    isUserAuthenticated(),
    getUserCoins(),
  ]);

  if (!novel) {
    notFound();
  }

  // Fire-and-forget unique view tracking; never block rendering on it.
  void recordNovelView(slug);

  const firstChapter = chapters[0];
  const bulkBuy = getBulkBuyState(chapters);

  return (
    <PageContainer as="article" width="prose">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <NovelCover
          title={novel.title}
          slug={novel.slug}
          coverUrl={novel.coverUrl}
          className="w-32 shrink-0 self-center sm:w-40 sm:self-start"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
            {novel.title}
          </h1>
          {novel.translator || novel.originalAuthor ? (
            <p className="mt-1 text-sm text-muted">
              {novel.translator ? (
                <>
                  Translated by{" "}
                  {novel.translatorUsername ? (
                    <Link
                      href={`/u/${novel.translatorUsername}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
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
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">by {novel.author}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="border-accent/30 text-accent">
              {statusLabel[novel.status]}
            </Badge>
            {novel.genres.map((genre) => (
              <Badge key={genre}>{genre}</Badge>
            ))}
          </div>

          {novel.synopsis ? <NovelDescription synopsis={novel.synopsis} /> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
            {firstChapter ? (
              <Link
                href={`/novels/${novel.slug}/${firstChapter.number}`}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-fit"
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
          </div>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Chapters
            <span className="ml-2 text-sm font-normal text-muted">
              {chapters.length}
            </span>
          </h2>
          <BulkBuyChapters
            novelSlug={novel.slug}
            chapters={chapters}
            userCoins={userCoins}
            isLoggedIn={isLoggedIn}
          />
        </div>
        <ChapterList slug={novel.slug} chapters={chapters} />
        {!bulkBuy.eligible ? (
          <div className="mt-4">
            <BulkBuyInfo advancedCount={bulkBuy.advancedCount} />
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
