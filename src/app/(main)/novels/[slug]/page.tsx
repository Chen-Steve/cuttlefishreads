import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { CommentSection } from "@/components/comments";
import {
  BookmarkButton,
  ChapterList,
  NovelCover,
  NovelDescription,
} from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import {
  getChapters,
  getNovel,
  isNovelBookmarked,
  isUserAuthenticated,
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
  const [novel, chapters, bookmarked, isLoggedIn] = await Promise.all([
    getNovel(slug),
    getChapters(slug),
    isNovelBookmarked(slug),
    isUserAuthenticated(),
  ]);

  if (!novel) {
    notFound();
  }

  const firstChapter = chapters[0];
  const authorLine = [
    novel.translator && `Translated by ${novel.translator}`,
    novel.originalAuthor && `Original by ${novel.originalAuthor}`,
  ]
    .filter(Boolean)
    .join(" · ");

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
          {authorLine ? (
            <p className="mt-1 text-sm text-muted">{authorLine}</p>
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
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Chapters
          <span className="ml-2 text-sm font-normal text-muted">
            {chapters.length}
          </span>
        </h2>
        <ChapterList slug={novel.slug} chapters={chapters} />
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
