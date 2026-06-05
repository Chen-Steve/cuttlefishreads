import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { ReaderNav } from "@/components/reader";
import {
  getAdjacentChapters,
  getChapter,
  getChapters,
  getNovel,
  getNovels,
} from "@/lib/data";

export function generateStaticParams() {
  return getNovels().flatMap((novel) =>
    getChapters(novel.slug).map((chapter) => ({
      slug: novel.slug,
      chapter: String(chapter.number),
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/novels/[slug]/[chapter]">): Promise<Metadata> {
  const { slug, chapter } = await params;
  const novel = getNovel(slug);
  const current = getChapter(slug, Number(chapter));
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
  const novel = getNovel(slug);
  const current = getChapter(slug, chapterNumber);

  if (!novel || !current || Number.isNaN(chapterNumber)) {
    notFound();
  }

  const { previous, next } = getAdjacentChapters(slug, chapterNumber);

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

      <div className="space-y-5 text-base leading-7 text-foreground/90 sm:text-[1.05rem] sm:leading-8">
        {current.content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <hr className="my-10 border-border" />

      <ReaderNav slug={slug} previous={previous} next={next} />
    </PageContainer>
  );
}
