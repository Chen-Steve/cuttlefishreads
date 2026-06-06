import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { ChapterContent, ChapterUnlockGate, ReaderNav } from "@/components/reader";
import {
  getAdjacentChapters,
  getChapter,
  getChapterSummaries,
  getNovel,
  getUserCoins,
  isUserAuthenticated,
} from "@/lib/data";
import { novelDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/novels/[slug]/[chapter]">): Promise<Metadata> {
  const { slug, chapter } = await params;
  const [novel, current] = await Promise.all([
    getNovel(slug),
    getChapter(slug, Number(chapter)),
  ]);
  if (!novel || !current) {
    return {
      title: "Chapter not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${novel.title} - Chapter ${current.number}: ${current.title}`;
  const description = current.locked
    ? `Read ${novel.title} on Cuttlefish Reads. Chapter ${current.number}, ${current.title}, is available with unlock access.`
    : `Read ${novel.title} Chapter ${current.number}: ${current.title} on Cuttlefish Reads. ${novelDescription(novel)}`;
  const path = `/novels/${novel.slug}/${current.number}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Cuttlefish Reads",
      type: "article",
      images: [
        {
          url: novel.coverUrl ?? "/cuttle.png",
          alt: novel.coverUrl ? `${novel.title} cover` : "Cuttlefish Reads",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [novel.coverUrl ?? "/cuttle.png"],
    },
    robots: {
      index: !current.locked,
      follow: true,
    },
  };
}

export default async function ChapterReaderPage({
  params,
}: PageProps<"/novels/[slug]/[chapter]">) {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);

  const [novel, current, { previous, next }, chapters, userCoins, isLoggedIn] =
    await Promise.all([
      getNovel(slug),
      getChapter(slug, chapterNumber),
      getAdjacentChapters(slug, chapterNumber),
      getChapterSummaries(slug),
      getUserCoins(),
      isUserAuthenticated(),
    ]);

  if (!novel || !current || Number.isNaN(chapterNumber)) {
    notFound();
  }

  return (
    <PageContainer as="article" width="narrow">
      <span data-hide-main-footer hidden />
      <header className="mb-4 text-center">
        <Link
          href={`/novels/${slug}`}
          title={novel.title}
          className="mx-auto block max-w-full truncate text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {novel.title}
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-balance text-foreground sm:text-2xl">
          Chapter {current.number}: {current.title}
        </h1>
        <div className="mt-4">
          <ReaderNav
            slug={slug}
            previous={previous}
            next={next}
            chapters={chapters}
            currentChapter={chapterNumber}
          />
        </div>
      </header>

      {current.locked ? (
        <ChapterUnlockGate
          novelSlug={slug}
          chapterNumber={chapterNumber}
          coinCost={current.coinCost}
          unlockAt={current.unlockAt}
          userCoins={userCoins}
          isLoggedIn={isLoggedIn}
        />
      ) : (
        <ChapterContent paragraphs={current.content} />
      )}

      <hr className="my-10 border-border" />

      <ReaderNav
        slug={slug}
        previous={previous}
        next={next}
        chapters={chapters}
        currentChapter={chapterNumber}
        menuPlacement="up"
      />
    </PageContainer>
  );
}
