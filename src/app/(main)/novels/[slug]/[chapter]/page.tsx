import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { ChapterUnlockGate, ReaderNav } from "@/components/reader";
import {
  getAdjacentChapters,
  getChapter,
  getNovel,
  getUserCoins,
  isUserAuthenticated,
} from "@/lib/data";

export async function generateMetadata({
  params,
}: PageProps<"/novels/[slug]/[chapter]">): Promise<Metadata> {
  const { slug, chapter } = await params;
  const [novel, current] = await Promise.all([
    getNovel(slug),
    getChapter(slug, Number(chapter)),
  ]);
  if (!novel || !current) {
    return { title: "Chapter not found" };
  }
  return { title: `${novel.title} — ${current.title}` };
}

export default async function ChapterReaderPage({
  params,
}: PageProps<"/novels/[slug]/[chapter]">) {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);

  const [novel, current, { previous, next }, userCoins, isLoggedIn] =
    await Promise.all([
      getNovel(slug),
      getChapter(slug, chapterNumber),
      getAdjacentChapters(slug, chapterNumber),
      getUserCoins(),
      isUserAuthenticated(),
    ]);

  if (!novel || !current || Number.isNaN(chapterNumber)) {
    notFound();
  }

  return (
    <PageContainer as="article" width="narrow">
      <header className="mb-8 text-center">
        <Link
          href={`/novels/${slug}`}
          className="text-sm font-medium text-balance text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {novel.title}
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Chapter {current.number}
        </h1>
        <p className="mt-1 text-pretty text-base text-muted">{current.title}</p>
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
        <div className="space-y-5 text-base leading-7 text-foreground/90 sm:text-[1.05rem] sm:leading-8">
          {current.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}

      <hr className="my-10 border-border" />

      <ReaderNav slug={slug} previous={previous} next={next} />
    </PageContainer>
  );
}
