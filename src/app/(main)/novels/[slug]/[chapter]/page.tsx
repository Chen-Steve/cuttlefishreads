import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CommentSection } from "@/components/comments";
import { PageContainer } from "@/components/page-container";
import {
  ChapterContent,
  ChapterReaderHeader,
  ChapterUnlockGate,
  ImmersiveChapterShell,
  ReaderNav,
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
import { originalsPublicUrl } from "@/lib/hosts";
import { isOriginalNovel } from "@/lib/originals-data";
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
  if (isOriginalNovel(novel)) {
    const chapterLabel = current.title
      ? `Chapter ${current.number}: ${current.title}`
      : `Chapter ${current.number}`;
    return {
      title: `${novel.title} - ${chapterLabel}`,
      description: `Read ${novel.title} ${chapterLabel} on Cuttlefish Originals. ${novelDescription(novel)}`,
      alternates: {
        canonical: originalsPublicUrl(
          `/series/${novel.slug}/chapter/${current.number}`,
        ),
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

  const [novel, current, chapters, userCoins, isLoggedIn] = await Promise.all([
    getNovel(slug),
    getChapter(slug, chapterNumber),
    getChapterSummaries(slug),
    getUserCoins(),
    isUserAuthenticated(),
  ]);

  if (!novel || !current || Number.isNaN(chapterNumber)) {
    notFound();
  }
  if (isOriginalNovel(novel)) {
    permanentRedirect(
      originalsPublicUrl(`/series/${novel.slug}/chapter/${chapterNumber}`),
    );
  }

  const index = chapters.findIndex((c) => c.number === chapterNumber);
  const previous =
    index > 0 ? { number: chapters[index - 1]!.number } : undefined;
  const next =
    index >= 0 && index < chapters.length - 1
      ? { number: chapters[index + 1]!.number }
      : undefined;

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
            previous={previous}
            next={next}
            chapters={chapters}
          />
        }
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
        bottomNav={
          !current.locked ? (
            <ReaderNav
              slug={slug}
              previous={previous}
              next={next}
              chapters={chapters}
              currentChapter={chapterNumber}
              menuPlacement="up"
            />
          ) : undefined
        }
        afterContent={
          !current.locked ? (
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
          ) : undefined
        }
      />
    </PageContainer>
  );
}
