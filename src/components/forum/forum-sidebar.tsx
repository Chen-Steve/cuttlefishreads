import Link from "next/link";

import { ForumAvatar } from "@/components/forum/forum-avatar";
import {
  forumProfileUrl,
  forumThreadUrl,
} from "@/lib/forum/constants";
import type {
  ForumSidebarFeed,
  ForumSidebarPost,
  ForumSidebarThread,
} from "@/lib/forum/types";
import { formatRelativeDate } from "@/lib/utils";

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <h2 className="border-b border-border px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function LatestPostsList({ posts }: { posts: ForumSidebarPost[] }) {
  if (posts.length === 0) return null;

  return (
    <ul className="divide-y divide-border">
      {posts.map((post) => (
        <li key={post.id} className="px-3.5 py-2.5">
          <Link
            href={forumThreadUrl(post.threadId, { postId: post.id })}
            className="block truncate text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {post.threadTitle}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">{post.excerpt}</p>
          <p className="mt-1 text-xs text-muted">
            <Link
              href={forumProfileUrl(post.author.username)}
              className="font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              {post.author.username}
            </Link>
            {" · "}
            {formatRelativeDate(post.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function LatestThreadsList({ threads }: { threads: ForumSidebarThread[] }) {
  if (threads.length === 0) return null;

  return (
    <ul className="divide-y divide-border">
      {threads.map((thread) => (
        <li key={thread.id} className="px-3.5 py-2.5">
          <Link
            href={forumThreadUrl(thread.id)}
            className="block truncate text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {thread.title}
          </Link>
          <p className="mt-1 text-xs text-muted">
            <Link
              href={forumProfileUrl(thread.author.username)}
              className="font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              {thread.author.username}
            </Link>
            {" · "}
            {formatRelativeDate(thread.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function LatestProfilePostsList({ posts }: { posts: ForumSidebarPost[] }) {
  if (posts.length === 0) return null;

  return (
    <ul className="divide-y divide-border">
      {posts.map((post) => (
        <li key={post.id} className="flex gap-2.5 px-3.5 py-2.5">
          <Link
            href={forumProfileUrl(post.author.username)}
            className="mt-0.5 shrink-0"
            aria-label={post.author.username}
          >
            <ForumAvatar author={post.author} className="size-8" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              <Link
                href={forumProfileUrl(post.author.username)}
                className="font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {post.author.username}
              </Link>
            </p>
            <Link
              href={forumThreadUrl(post.threadId, { postId: post.id })}
              className="mt-0.5 block truncate text-xs text-muted transition-colors hover:text-accent"
            >
              {post.excerpt}
            </Link>
            <p className="mt-1 truncate text-xs text-muted">
              in {post.threadTitle}
              {" · "}
              {formatRelativeDate(post.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ForumSidebar({ feed }: { feed: ForumSidebarFeed }) {
  const hasPosts = feed.latestPosts.length > 0;
  const hasThreads = feed.latestThreads.length > 0;
  const hasProfilePosts = feed.latestProfilePosts.length > 0;

  if (!hasPosts && !hasThreads && !hasProfilePosts) return null;

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
      {hasPosts ? (
        <SidebarCard title="Latest Posts">
          <LatestPostsList posts={feed.latestPosts} />
        </SidebarCard>
      ) : null}
      {hasThreads ? (
        <SidebarCard title="Latest Threads">
          <LatestThreadsList threads={feed.latestThreads} />
        </SidebarCard>
      ) : null}
      {hasProfilePosts ? (
        <SidebarCard title="Latest Profile Posts">
          <LatestProfilePostsList posts={feed.latestProfilePosts} />
        </SidebarCard>
      ) : null}
    </aside>
  );
}
