import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ForumPagination } from "@/components/forum/forum-pagination";
import { ForumThreadList } from "@/components/forum/forum-thread-list";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { PageContainer } from "@/components/page-container";
import { ORIGINALS } from "@/lib/constants";
import { forumCategoryUrl, forumUrl } from "@/lib/forum/constants";
import {
  getCategoryThreads,
  getForumCategory,
  getForumViewer,
} from "@/lib/forum/data";
import { originalsPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/originals/forum/c/[categorySlug]">): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getForumCategory(categorySlug);

  if (!category) {
    return { title: "Category not found" };
  }

  return originalsPageMetadata({
    title: `${category.name} - ${ORIGINALS.shortName} forum`,
    description:
      category.description ||
      `Threads in ${category.name} on the Cuttlefish Originals forum.`,
    path: `/forum/c/${category.slug}`,
  });
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function ForumCategoryPage({
  params,
  searchParams,
}: PageProps<"/originals/forum/c/[categorySlug]">) {
  const [{ categorySlug }, query] = await Promise.all([params, searchParams]);
  const category = await getForumCategory(categorySlug);
  if (!category) notFound();

  const viewer = await getForumViewer();
  const { threads, page, pageCount } = await getCategoryThreads(
    category,
    parsePage(query.page),
  );

  return (
    <PageContainer
      as="section"
      className="flex flex-col gap-5 pt-4 pb-8 sm:pt-5 sm:pb-10"
    >
      <header>
        <Link
          href={forumUrl()}
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition-opacity hover:opacity-80"
        >
          <ChevronLeft className="size-3.5" strokeWidth={2.5} aria-hidden />
          Forum
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-1 text-sm text-muted">{category.description}</p>
        ) : null}
      </header>

      <NewThreadForm
        categorySlug={category.slug}
        categoryName={category.name}
        isLoggedIn={Boolean(viewer)}
        canPost={!category.adminOnlyThreads || Boolean(viewer?.isMasterAdmin)}
      />

      <ForumThreadList threads={threads} />

      <ForumPagination
        page={page}
        pageCount={pageCount}
        buildHref={(target) => forumCategoryUrl(category.slug, target)}
      />
    </PageContainer>
  );
}
