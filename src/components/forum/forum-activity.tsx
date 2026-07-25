import Link from "next/link";

import { forumThreadUrl } from "@/lib/forum/constants";
import type { ForumProfileActivity } from "@/lib/forum/types";
import { formatRelativeDate } from "@/lib/utils";

function excerpt(text: string, limit = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

export function ForumActivity({
  activity,
}: {
  activity: ForumProfileActivity;
}) {
  const hasActivity =
    activity.threads.length > 0 || activity.posts.length > 0;
  if (!hasActivity) return null;

  return (
    <section>
      <h2 className="mb-2.5 text-sm font-semibold tracking-tight text-foreground">
        Forum activity
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {activity.threads.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <p className="border-b border-border px-3.5 py-2 text-xs font-medium text-muted">
              Threads started
            </p>
            <ul className="divide-y divide-border">
              {activity.threads.map((thread) => (
                <li key={thread.id} className="px-3.5 py-2.5">
                  <Link
                    href={forumThreadUrl(thread.id)}
                    className="block truncate text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {thread.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {thread.categoryName}
                    {" · "}
                    {formatRelativeDate(thread.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {activity.posts.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <p className="border-b border-border px-3.5 py-2 text-xs font-medium text-muted">
              Recent posts
            </p>
            <ul className="divide-y divide-border">
              {activity.posts.map((post) => (
                <li key={post.id} className="px-3.5 py-2.5">
                  <Link
                    href={forumThreadUrl(post.threadId, { postId: post.id })}
                    className="block truncate text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {post.threadTitle}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {excerpt(post.excerpt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
