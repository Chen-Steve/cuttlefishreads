import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comments";
import { PageContainer } from "@/components/page-container";
import {
  ChapterContent,
  ChapterUnlockGate,
  ReaderNav,
  TranslatorNote,
} from "@/components/reader";
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

  const chapterLabel = current.title
    ? `Chapter ${current.number}: ${current.title}`
    : `Chapter ${current.number}`;
  const title = `${novel.title} - ${chapterLabel}`;
  const description = current.locked
    ? `Read ${novel.title} on Cuttlefish Reads. ${chapterLabel} is available with unlock access.`
    : `Read ${novel.title} ${chapterLabel} on Cuttlefish Reads. ${novelDescription(novel)}`;
  const path = `/novels/${novel.slug}/${current.number}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
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
    <PageContainer as="article" width="narrow" className="pt-4 sm:pt-6 lg:pt-6">
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
          {current.title
            ? `Chapter ${current.number}: ${current.title}`
            : `Chapter ${current.number}`}
        </h1>
        <div className="mt-4">
          <ReaderNav
            slug={slug}
            previous={previous}
            next={next}
            chapters={chapters}
            currentChapter={chapterNumber}
            showSettings
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

      {!current.locked ? (
        <>
          <TranslatorNote
            name={novel.translator || novel.translatorUsername || "The translator"}
            username={novel.translatorUsername}
            note={
              current.useGlobalTranslatorNote
                ? (novel.translatorGlobalNote ?? null)
                : current.translatorNote
            }
            kofiUrl={novel.translatorKofiUrl}
            patreonUrl={novel.translatorPatreonUrl}
          />

          <hr className="my-6 border-border" />

          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
              Comments
            </h2>
            <CommentSection
              mode="chapter"
              novelSlug={slug}
              chapterNumber={chapterNumber}
            />
          </section>
        </>
      ) : null}

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
