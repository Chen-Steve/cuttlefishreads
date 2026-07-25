import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { ForumCategoryList } from "@/components/forum/forum-category-list";
import { ForumSidebar } from "@/components/forum/forum-sidebar";
import { PageContainer } from "@/components/page-container";
import { ORIGINALS } from "@/lib/constants";
import { forumManageUrl } from "@/lib/forum/constants";
import {
  getForumCategories,
  getForumSidebarFeed,
  getForumViewer,
  groupForumCategories,
} from "@/lib/forum/data";
import { originalsPageMetadata } from "@/lib/seo";

export const metadata: Metadata = originalsPageMetadata({
  title: `Forum - ${ORIGINALS.shortName}`,
  description:
    "Talk shop with other readers and authors on the Cuttlefish Originals forum.",
  path: "/forum",
});

export default async function ForumPage() {
  const [categories, viewer, sidebar] = await Promise.all([
    getForumCategories(),
    getForumViewer(),
    getForumSidebarFeed(),
  ]);

  const groups = groupForumCategories(categories);
  const hasSidebar =
    sidebar.latestPosts.length > 0 ||
    sidebar.latestThreads.length > 0 ||
    sidebar.latestProfilePosts.length > 0;

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10">
      <header className="">
        <div className="mt-1 flex items-baseline justify-between gap-3">

          {viewer?.isMasterAdmin ? (
            <Link
              href={forumManageUrl()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
            >
              <Settings2 className="size-4" strokeWidth={1.75} aria-hidden />
              Manage
            </Link>
          ) : null}
        </div>
      </header>

      <div
        className={
          hasSidebar
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_19rem]"
            : undefined
        }
      >
        <ForumCategoryList groups={groups} />
        {hasSidebar ? <ForumSidebar feed={sidebar} /> : null}
      </div>
    </PageContainer>
  );
}
