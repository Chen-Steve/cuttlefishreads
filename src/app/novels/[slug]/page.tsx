import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ChapterList, NovelCover } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { Badge } from "@/components/ui/badge";
import { getChapters, getNovel, getNovels } from "@/lib/data";

const statusLabel = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
} as const;

export function generateStaticParams() {
  return getNovels().map((novel) => ({ slug: novel.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/novels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const novel = getNovel(slug);
  return { title: novel?.title ?? "Novel not found" };
}

export default async function NovelDetailPage({
  params,
}: PageProps<"/novels/[slug]">) {
  const { slug } = await params;
  const novel = getNovel(slug);

  if (!novel) {
    notFound();
  }

  const chapters = getChapters(slug);
  const firstChapter = chapters[0];

  return (
    <PageContainer as="article" width="prose">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <NovelCover
          title={novel.title}
          slug={novel.slug}
          className="w-32 shrink-0 self-center sm:w-40 sm:self-start"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
            {novel.title}
          </h1>
          <p className="mt-1 text-sm text-muted">by {novel.author}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="border-accent/30 text-accent">
              {statusLabel[novel.status]}
            </Badge>
            {novel.genres.map((genre) => (
              <Badge key={genre}>{genre}</Badge>
            ))}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-foreground/90">
            {novel.synopsis}
          </p>

          {firstChapter ? (
            <Link
              href={`/novels/${novel.slug}/${firstChapter.number}`}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-fit"
            >
              <BookOpen className="size-4" strokeWidth={1.75} aria-hidden />
              Start reading
            </Link>
          ) : null}
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
    </PageContainer>
  );
}
