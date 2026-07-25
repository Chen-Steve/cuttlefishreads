import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock, Pin } from "lucide-react";

import { ForumPagination } from "@/components/forum/forum-pagination";
import { ForumPostItem } from "@/components/forum/forum-post-item";
import { ReplyForm } from "@/components/forum/reply-form";
import { ThreadModeration } from "@/components/forum/thread-moderation";
import { PageContainer } from "@/components/page-container";
import { ORIGINALS } from "@/lib/constants";
import { forumCategoryUrl, forumThreadUrl } from "@/lib/forum/constants";
import { getForumThread, getForumViewer, getPostPage } from "@/lib/forum/data";
import { originalsPageMetadata } from "@/lib/seo";
import { formatRelativeDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/originals/forum/t/[threadId]">): Promise<Metadata> {
  const { threadId } = await params;
  const result = await getForumThread(threadId);

  if (!result) {
    return { title: "Thread not found" };
  }

  return originalsPageMetadata({
    title: `${result.thread.title} - ${ORIGINALS.shortName} forum`,
    description: `A discussion in ${result.thread.categoryName} on the Cuttlefish Originals forum.`,
    path: `/forum/t/${threadId}`,
  });
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForumThreadPage({
  params,
  searchParams,
}: PageProps<"/originals/forum/t/[threadId]">) {
  const [{ threadId }, query] = await Promise.all([params, searchParams]);
  const viewer = await getForumViewer();

  // Inbox links point at a post rather than a page number.
  const targetPost = firstValue(query.post);
  const requestedPage = targetPost
    ? await getPostPage(threadId, targetPost)
    : parsePage(query.page);

  const result = await getForumThread(
    threadId,
    requestedPage,
    viewer?.userId ?? null,
  );

  if (!result) notFound();
  const { thread, posts, page, pageCount } = result;

  return (
    <PageContainer
      as="section"
      className="flex flex-col gap-5 pt-4 pb-8 sm:pt-5 sm:pb-10"
    >
      <header>
        <Link
          href={forumCategoryUrl(thread.categorySlug)}
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition-opacity hover:opacity-80"
        >
          <ChevronLeft className="size-3.5" strokeWidth={2.5} aria-hidden />
          {thread.categoryName}
        </Link>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {thread.isPinned ? (
            <Pin className="size-4 text-accent" strokeWidth={2} aria-label="Pinned" />
          ) : null}
          {thread.isLocked ? (
            <Lock className="size-4 text-muted" strokeWidth={2} aria-label="Locked" />
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {thread.title}
          </h1>
        </div>

        <p className="mt-1 text-sm text-muted">
          Started by {thread.author.username}
          {" · "}
          {formatRelativeDate(thread.createdAt)}
          {" · "}
          {thread.replyCount.toLocaleString()}{" "}
          {thread.replyCount === 1 ? "reply" : "replies"}
        </p>

        {viewer?.isMasterAdmin ? (
          <div className="mt-3">
            <ThreadModeration
              threadId={thread.id}
              categorySlug={thread.categorySlug}
              isPinned={thread.isPinned}
              isLocked={thread.isLocked}
            />
          </div>
        ) : null}
      </header>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {posts.map((post) => (
          <ForumPostItem
            key={post.id}
            post={post}
            canReact={Boolean(viewer)}
            isMasterAdmin={Boolean(viewer?.isMasterAdmin)}
          />
        ))}
      </div>

      <ForumPagination
        page={page}
        pageCount={pageCount}
        buildHref={(target) => forumThreadUrl(thread.id, { page: target })}
      />

      <ReplyForm
        threadId={thread.id}
        isLoggedIn={Boolean(viewer)}
        isLocked={thread.isLocked}
      />
    </PageContainer>
  );
}
