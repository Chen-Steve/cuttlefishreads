import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comments";
import { PageContainer } from "@/components/page-container";
import {
  ChapterContent,
  ChapterReaderHeader,
  ImmersiveChapterShell,
  ReaderNav,
  ReadingEngagementTracker,
  ReadingProgressTracker,
  TranslatorNote,
} from "@/components/reader";
import { StructuredData } from "@/components/structured-data";
import {
  getChapter,
  getChapterSummaries,
  getNovel,
  isUserAuthenticated,
} from "@/lib/data";
import { creatorPublicOrigin, originalsPublicUrl } from "@/lib/hosts";
import { isOriginalNovel } from "@/lib/originals-data";
import {
  novelDescription,
  originalsPageMetadata,
  truncateDescription,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const [novel, current] = await Promise.all([
    getNovel(slug),
    getChapter(slug, Number(chapter)),
  ]);
  if (!novel || !current || !isOriginalNovel(novel)) {
    return {
      title: "Chapter not found",
      robots: { index: false, follow: false },
    };
  }

  const chapterLabel = current.title
    ? `Chapter ${current.number}: ${current.title}`
    : `Chapter ${current.number}`;

  return originalsPageMetadata({
    title: `${novel.title} - ${chapterLabel}`,
    description: truncateDescription(
      `Read ${novel.title} ${chapterLabel} on Cuttlefish Originals. ${novelDescription(novel)}`,
    ),
    path: `/series/${novel.slug}/chapter/${current.number}`,
    image: novel.coverUrl,
    openGraphType: "article",
  });
}

export default async function OriginalsChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);

  const [novel, current, chapters, isLoggedIn] = await Promise.all([
    getNovel(slug),
    getChapter(slug, chapterNumber),
    getChapterSummaries(slug),
    isUserAuthenticated(),
  ]);

  if (!novel || !current || Number.isNaN(chapterNumber) || !isOriginalNovel(novel)) {
    notFound();
  }

  // Originals UX: always present as free reading (unlock UI omitted).
  const readable = {
    ...current,
    locked: false,
  };

  const index = chapters.findIndex((c) => c.number === chapterNumber);
  const previous =
    index > 0 ? { number: chapters[index - 1]!.number } : undefined;
  const next =
    index >= 0 && index < chapters.length - 1
      ? { number: chapters[index + 1]!.number }
      : undefined;

  const freeChapters = chapters.map((c) => ({ ...c, locked: false }));

  return (
    <PageContainer as="article" width="narrow" className="pt-4 sm:pt-6 lg:pt-6">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Chapter",
          name: readable.title
            ? `Chapter ${readable.number}: ${readable.title}`
            : `Chapter ${readable.number}`,
          url: originalsPublicUrl(
            `/series/${novel.slug}/chapter/${readable.number}`,
          ),
          datePublished: readable.publishedAt,
          isPartOf: {
            "@type": "Book",
            name: novel.title,
            url: originalsPublicUrl(`/series/${novel.slug}`),
          },
          author: {
            "@type": "Person",
            name: novel.translator || novel.author,
          },
          position: readable.number,
        }}
      />
      <ReadingProgressTracker slug={slug} chapterNumber={chapterNumber} />
      <ReadingEngagementTracker
        slug={slug}
        chapterNumber={chapterNumber}
        isLoggedIn={isLoggedIn}
      />
      <ImmersiveChapterShell
        header={
          <ChapterReaderHeader
            slug={slug}
            novelTitle={novel.title}
            chapterNumber={chapterNumber}
            chapterTitle={readable.title}
            previous={previous}
            next={next}
            chapters={freeChapters}
            catalogBase="series"
          />
        }
        content={<ChapterContent paragraphs={readable.content} />}
        bottomNav={
          <ReaderNav
            slug={slug}
            previous={previous}
            next={next}
            chapters={freeChapters}
            currentChapter={chapterNumber}
            menuPlacement="up"
            catalogBase="series"
          />
        }
        afterContent={
          <>
            <TranslatorNote
              name={
                novel.translator || novel.translatorUsername || "The author"
              }
              username={novel.translatorUsername}
              profileHref={
                novel.translatorUsername
                  ? creatorPublicOrigin(novel.translatorUsername)
                  : undefined
              }
              note={
                readable.useGlobalTranslatorNote
                  ? (novel.translatorGlobalNote ?? null)
                  : readable.translatorNote
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
        }
      />
    </PageContainer>
  );
}
