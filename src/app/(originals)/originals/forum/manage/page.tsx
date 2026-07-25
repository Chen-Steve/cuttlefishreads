import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { CategoryManager } from "@/components/forum/category-manager";
import { PageContainer } from "@/components/page-container";
import { ORIGINALS } from "@/lib/constants";
import { forumUrl } from "@/lib/forum/constants";
import {
  getForumCategories,
  getForumSections,
  getForumViewer,
  groupForumCategories,
} from "@/lib/forum/data";

export const metadata: Metadata = {
  title: `Manage forum - ${ORIGINALS.shortName}`,
  robots: { index: false, follow: false },
};

export default async function ForumManagePage() {
  const viewer = await getForumViewer();
  if (!viewer?.isMasterAdmin) notFound();

  const [categories, sections] = await Promise.all([
    getForumCategories(),
    getForumSections(),
  ]);

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
          Manage the board
        </h1>
        <p className="mt-1 text-sm text-muted">
          Sections and the categories inside them appear in ascending order. A
          category has to be empty before it can be deleted.
        </p>
      </header>

      <CategoryManager
        groups={groupForumCategories(categories)}
        sections={sections}
      />
    </PageContainer>
  );
}
