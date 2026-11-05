import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comments";
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
  getNovel,
  getPublicChapterMeta,
  getPublicFreeChapter,
  getPublicChapterNeighbors,
} from "@/lib/data";
import { getSessionProfile } from "@/lib/session-profile";
import { publicPageMetadata } from "@/lib/seo";

// Without a chapter loading boundary, a cache miss keeps the current chapter
// visible until the next chapter (including its access check) is ready.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/novels/[slug]/[chapter]">): Promise<Metadata> {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);
  const [novel, current] = await Promise.all([
    getNovel(slug),
    getPublicChapterMeta(slug, chapterNumber),
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

  return publicPageMetadata({
    title: `${novel.title} — ${chapterLabel}`,
    description: chapterLabel,
    path: `/novels/${novel.slug}/${current.number}`,
  });
}

export default async function ChapterReaderPage({
  params,
}: PageProps<"/novels/[slug]/[chapter]">) {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);

  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) notFound();
  const meta = await getPublicChapterMeta(slug, chapterNumber);
  if (!meta) notFound();
  const [novel, current, neighbors] = await Promise.all([
    getNovel(slug),
    // Only explicitly free chapters may be included in a shared prerender.
    // Paid and timed-release chapters always run the server access check.
    meta.isFree
      ? getPublicFreeChapter(slug, chapterNumber)
      : getChapter(slug, chapterNumber),
    getPublicChapterNeighbors(slug, chapterNumber),
  ]);

  if (!novel || !current) {
    notFound();
  }

  const previous =
    neighbors.previous != null ? { number: neighbors.previous } : undefined;
  const next = neighbors.next != null ? { number: neighbors.next } : undefined;

  const session = current.locked ? await getSessionProfile() : null;
  const userCoins = session?.coins ?? 0;
  const isLoggedIn = Boolean(session);

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
          currentChapter: chapterNumber,
          enablePrefetch: !current.locked,
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
            <CommentSection
              mode="chapter"
              novelSlug={slug}
              chapterNumber={chapterNumber}
            />
          </section>
        </>
      ) : null}
    </PageContainer>
  );
}
