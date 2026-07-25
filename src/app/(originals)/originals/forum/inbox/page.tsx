import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, LogIn } from "lucide-react";

import { InboxList } from "@/components/forum/inbox-list";
import { PageContainer } from "@/components/page-container";
import { ORIGINALS } from "@/lib/constants";
import { forumLoginUrl, forumUrl } from "@/lib/forum/constants";
import { getForumNotifications, getForumViewer } from "@/lib/forum/data";
import { originalsPageMetadata } from "@/lib/seo";

export const metadata: Metadata = originalsPageMetadata({
  title: `Inbox - ${ORIGINALS.shortName} forum`,
  description: "Replies and reactions to your forum posts.",
  path: "/forum/inbox",
});

export default async function ForumInboxPage() {
  const viewer = await getForumViewer();
  const notifications = viewer
    ? await getForumNotifications(viewer.userId)
    : [];

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
          Inbox
        </h1>
        <p className="mt-1 text-sm text-muted">
          Replies and reactions to the threads and posts you take part in.
        </p>
      </header>

      {viewer ? (
        <InboxList notifications={notifications} />
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Sign in to see replies and reactions to your posts.
          </p>
          <Link
            href={forumLoginUrl("/forum/inbox")}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <LogIn className="size-4" strokeWidth={1.75} aria-hidden />
            Sign in
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
