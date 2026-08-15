import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CommentSection, CommentsFallback } from "@/components/comments";
import { PageContainer } from "@/components/page-container";
import {
  ChapterContent,
  ChapterReaderHeader,
  ChapterUnlockGate,
  ImmersiveChapterShell,
  ReadingProgressTracker,
  TranslatorNote,
} from "@/components/reader";
import {
  getChapter,
  getChapterSummaries,
  getNovel,
  getUserCoins,
  isUserAuthenticated,
} from "@/lib/data";
import { publicPageMetadata, novelDescription } from "@/lib/seo";
import { SITE } from "@/lib/constants";

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
    ? `Read ${novel.title} on ${SITE.name}. ${chapterLabel} is available with unlock access.`
    : `Read ${novel.title} ${chapterLabel} on ${SITE.name}. ${novelDescription(novel)}`;
  const path = `/novels/${novel.slug}/${current.number}`;

  return {
    ...publicPageMetadata({
      title,
      description,
      path,
      index: !current.locked,
    }),
  };
}

export default async function ChapterReaderPage({
  params,
}: PageProps<"/novels/[slug]/[chapter]">) {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);

  const [novel, current, chapters] = await Promise.all([
    getNovel(slug),
    getChapter(slug, chapterNumber),
    getChapterSummaries(slug),
  ]);

  if (!novel || !current || Number.isNaN(chapterNumber)) {
    notFound();
  }

  const index = chapters.findIndex((c) => c.number === chapterNumber);
  const previous =
    index > 0 ? { number: chapters[index - 1]!.number } : undefined;
  const next =
    index >= 0 && index < chapters.length - 1
      ? { number: chapters[index + 1]!.number }
      : undefined;

  const unlockState = current.locked
    ? await Promise.all([getUserCoins(), isUserAuthenticated()])
    : null;
  const userCoins = unlockState?.[0] ?? 0;
  const isLoggedIn = unlockState?.[1] ?? false;

  const chapterTitles = Object.fromEntries(
    chapters.map((c) => [c.number, c.title || `Chapter ${c.number}`]),
  );

  return (
    <PageContainer as="article" width="narrow" className="pt-4 sm:pt-6 lg:pt-6">
      <span data-hide-main-footer hidden />
      {!current.locked ? (
        <ReadingProgressTracker slug={slug} chapterNumber={chapterNumber} />
      ) : null}
      <ImmersiveChapterShell
        header={
          <ChapterReaderHeader
            slug={slug}
            novelTitle={novel.title}
            chapterNumber={chapterNumber}
            chapterTitle={current.title}
          />
        }
        nav={{
          slug,
          previous,
          next,
          chapters,
          currentChapter: chapterNumber,
        }}
        content={
          current.locked ? (
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
          )
        }
      />

      {!current.locked ? (
        <>
          <TranslatorNote
            name={
              novel.translator || novel.translatorUsername || "The translator"
            }
            username={novel.translatorUsername}
            note={
              current.useGlobalTranslatorNote
                ? (novel.translatorGlobalNote ?? null)
                : current.translatorNote
            }
            kofiUrl={novel.translatorKofiUrl}
            patreonUrl={novel.translatorPatreonUrl}
          />

          <section className="mt-6 mb-10" aria-label="Comments">
            <Suspense fallback={<CommentsFallback />}>
              <CommentSection
                mode="chapter"
                novelSlug={slug}
                chapterNumber={chapterNumber}
                chapterTitles={chapterTitles}
              />
            </Suspense>
          </section>
        </>
      ) : null}
    </PageContainer>
  );
}
