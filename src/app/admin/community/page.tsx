import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { formatRelativeDate } from "@/lib/utils";
import { createAdminClient } from "@/utils/supabase/admin";
import type { CommunityPostKind, CommunityPostStatus } from "@/types";

import { CommunityModerationControls } from "./_components/moderation-controls";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type AdminPostRow = {
  id: string;
  user_id: string;
  kind: CommunityPostKind;
  title: string;
  body: string;
  status: CommunityPostStatus;
  vote_count: number;
  created_at: string;
};

function kindLabel(kind: CommunityPostKind) {
  return kind === "novel_request" ? "Novel request" : "Idea";
}

export default async function AdminCommunityPage() {
  const access = await getAdminAccess();
  if (!access?.isMasterAdmin) notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("community_posts")
    .select("id, user_id, kind, title, body, status, vote_count, created_at")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AdminPostRow[]>();

  const posts = rows ?? [];
  const userIds = [...new Set(posts.map((post) => post.user_id))];
  const { data: profiles } =
    userIds.length === 0
      ? { data: [] as { id: string; username: string | null }[] }
      : await admin
          .from("profiles")
          .select("id, username")
          .in("id", userIds)
          .returns<{ id: string; username: string | null }[]>();

  const usernameById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.username || "Unknown",
    ]),
  );

  return (
    <PageContainer as="div">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Community board
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Moderate novel requests and ideas.{" "}
        <Link
          href="/community"
          className="font-medium text-accent hover:text-accent-hover"
        >
          View public board
        </Link>
      </p>
      <p className="mt-1 text-sm text-muted">
        {posts.length === 0
          ? "No posts yet"
          : `${posts.length} post${posts.length === 1 ? "" : "s"}`}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
            Nothing on the board yet.
          </p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {kindLabel(post.kind)} · {post.vote_count} vote
                    {post.vote_count === 1 ? "" : "s"}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-foreground">
                    {post.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {usernameById.get(post.user_id) ?? "Unknown"} ·{" "}
                    {formatRelativeDate(post.created_at)}
                  </p>
                </div>
                <CommunityModerationControls
                  postId={post.id}
                  status={post.status}
                />
              </div>
              {post.body ? (
                <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                  {post.body}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </PageContainer>
  );
}
