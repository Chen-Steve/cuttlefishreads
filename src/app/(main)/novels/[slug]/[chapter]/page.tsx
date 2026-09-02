import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CommentSection, CommentsFallback } from "@/components/comments";
import { PageContainer } from "@/components/page-container";
import { ChapterContent } from "@/components/reader/chapter-content";
import {
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
} from "@/lib/data";
import { getSessionProfile } from "@/lib/session-profile";
import { publicPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/novels/[slug]/[chapter]">): Promise<Metadata> {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);
  const [novel, summaries] = await Promise.all([
    getNovel(slug),
    getChapterSummaries(slug),
  ]);
  const current = summaries.find((entry) => entry.number === chapterNumber);
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

  return publicPageMetadata({
    title: `${novel.title} — ${chapterLabel}`,
    description: chapterLabel,
    path: `/novels/${novel.slug}/${current.number}`,
    index: !current.locked,
  });
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

  const session = current.locked ? await getSessionProfile() : null;
  const userCoins = session?.coins ?? 0;
  const isLoggedIn = Boolean(session);

  const chapterTitles = Object.fromEntries(
    chapters.map((c) => [c.number, c.title || `Chapter ${c.number}`]),
  );

  return (
    <PageContainer as="article" width="narrow" className="pt-4 sm:pt-6 lg:pt-6">
      <span data-hide-main-footer hidden />
      {!current.locked ? (
        <ReadingProgressTracker
          slug={slug}
          chapterNumber={chapterNumber}
          title={novel.title}
          coverUrl={novel.coverUrl}
          chapterCount={novel.chapterCount}
        />
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
      >
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
          <ChapterContent paragraphs={current.content ?? []} />
        )}
      </ImmersiveChapterShell>

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
