import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import type { NovelComment } from "@/types";

import {
  CommentsManager,
  type NovelCommentGroup,
} from "../comments/_components/comments-manager";

type CommentRow = {
  id: string;
  novel_slug: string;
  chapter_number: number | null;
  parent_id: string | null;
  body: string;
  rating: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

const COMMENT_COLUMNS =
  "id, novel_slug, chapter_number, parent_id, body, rating, user_id, created_at, updated_at";

export async function WorkspaceCommentsPage({
  workspace,
}: {
  workspace: WorkspaceKind;
}) {
  const access = await getAdminAccess();
  if (!access) notFound();

  const admin = createAdminClient();

  let novelsQuery = admin
    .from("novels")
    .select("id, slug, title, publisher_id")
    .eq("publication_type", WORKSPACE_PUBLICATION_TYPE[workspace])
    .order("updated_at", { ascending: false });

  if (!access.isMasterAdmin) {
    novelsQuery = novelsQuery.eq("publisher_id", access.userId);
  }

  const { data: novels } = await novelsQuery.returns<
    { id: string; slug: string; title: string; publisher_id: string | null }[]
  >();

  const novelRows = novels ?? [];
  const slugs = novelRows.map((n) => n.slug);
  const publisherBySlug = new Map(
    novelRows.map((n) => [n.slug, n.publisher_id]),
  );

  // Top-level comments across every owned novel, newest first.
  const { data: topData } =
    slugs.length === 0
      ? { data: [] as CommentRow[] }
      : await admin
          .from("novel_comments")
          .select(COMMENT_COLUMNS)
          .in("novel_slug", slugs)
          .is("parent_id", null)
          .order("created_at", { ascending: false })
          .returns<CommentRow[]>();

  const topRows = topData ?? [];
  const parentIds = topRows.map((row) => row.id);

  const { data: replyData } =
    parentIds.length === 0
      ? { data: [] as CommentRow[] }
      : await admin
          .from("novel_comments")
          .select(COMMENT_COLUMNS)
          .in("parent_id", parentIds)
          .order("created_at", { ascending: true })
          .returns<CommentRow[]>();

  const replyRows = replyData ?? [];

  const userIds = [
    ...new Set([...topRows, ...replyRows].map((row) => row.user_id)),
  ];
  const usernameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    for (const p of (profiles ?? []) as { id: string; username: string | null }[]) {
      usernameById.set(p.id, p.username ?? "Unknown");
    }
  }

  function toComment(row: CommentRow): NovelComment {
    const publisherId = publisherBySlug.get(row.novel_slug) ?? null;
    return {
      id: row.id,
      novelSlug: row.novel_slug,
      chapterNumber: row.chapter_number,
      parentId: row.parent_id,
      body: row.body,
      rating: row.rating ?? null,
      userId: row.user_id,
      username: usernameById.get(row.user_id) ?? "Unknown",
      likeCount: 0,
      likedByCurrentUser: false,
      isOwn: row.user_id === access!.userId,
      isTranslatorReply:
        row.parent_id != null &&
        publisherId != null &&
        row.user_id === publisherId,
      replies: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const repliesByParent = new Map<string, NovelComment[]>();
  for (const row of replyRows) {
    const list = repliesByParent.get(row.parent_id as string) ?? [];
    list.push(toComment(row));
    repliesByParent.set(row.parent_id as string, list);
  }

  const titleBySlug = new Map(novelRows.map((n) => [n.slug, n.title]));
  const groupsBySlug = new Map<string, NovelComment[]>();
  for (const row of topRows) {
    const comment = toComment(row);
    comment.replies = repliesByParent.get(comment.id) ?? [];
    const list = groupsBySlug.get(row.novel_slug) ?? [];
    list.push(comment);
    groupsBySlug.set(row.novel_slug, list);
  }

  const groups: NovelCommentGroup[] = novelRows
    .filter((n) => groupsBySlug.has(n.slug))
    .map((n) => ({
      novelSlug: n.slug,
      novelTitle: titleBySlug.get(n.slug) ?? n.slug,
      comments: groupsBySlug.get(n.slug) ?? [],
    }));

  return (
    <PageContainer as="div">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Comments
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Reader comments across your{" "}
        {workspace === "originals" ? "series" : "novels"}. Reply directly to
        start a thread.
      </p>

      <div className="mt-6">
        <CommentsManager groups={groups} />
      </div>
    </PageContainer>
  );
}
