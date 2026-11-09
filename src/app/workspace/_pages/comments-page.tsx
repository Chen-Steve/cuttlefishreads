import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getServerSupabase } from "@/utils/supabase/auth";
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

const COMMENT_WITH_AUTHOR = `${COMMENT_COLUMNS}, author:profiles(username)`;

type ProfileEmbed =
  | { username: string | null }
  | { username: string | null }[]
  | null;

type CommentQueryRow = CommentRow & { author: ProfileEmbed };

function embeddedUsername(author: ProfileEmbed): string {
  const row = Array.isArray(author) ? author[0] : author;
  return row?.username ?? "Unknown";
}

/** Newest top-level comments loaded for the workspace comments page. */
const TOP_COMMENTS_LIMIT = 100;

export async function WorkspaceCommentsPage() {
  const access = await getAdminAccess();
  if (!access) notFound();

  const supabase = await getServerSupabase();

  let novelsQuery = supabase
    .from("novels")
    .select("id, slug, title, publisher_id")
    .eq("publication_type", "translation")
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

  // Usernames come back with each comment, so the page does not make a
  // third trip just to look up profiles.
  const { data: topData, error: commentsError } =
    slugs.length === 0
      ? { data: [] as CommentQueryRow[], error: null }
      : await supabase
          .from("novel_comments")
          .select(COMMENT_WITH_AUTHOR)
          .in("novel_slug", slugs)
          .is("parent_id", null)
          .order("created_at", { ascending: false })
          .limit(TOP_COMMENTS_LIMIT)
          .returns<CommentQueryRow[]>();
  if (commentsError) {
    throw new Error("Could not load workspace comments", { cause: commentsError });
  }

  const topRows = topData ?? [];
  const commentsTruncated = topRows.length >= TOP_COMMENTS_LIMIT;
  const parentIds = topRows.map((row) => row.id);

  const { data: replyData, error: repliesError } =
    parentIds.length === 0
      ? { data: [] as CommentQueryRow[], error: null }
      : await supabase
          .from("novel_comments")
          .select(COMMENT_WITH_AUTHOR)
          .in("parent_id", parentIds)
          .order("created_at", { ascending: true })
          .returns<CommentQueryRow[]>();
  if (repliesError) {
    throw new Error("Could not load workspace comment replies", { cause: repliesError });
  }

  function toComment(
    row: CommentQueryRow,
    replies: NovelComment[] = [],
  ): NovelComment {
    const publisherId = publisherBySlug.get(row.novel_slug) ?? null;
    return {
      id: row.id,
      novelSlug: row.novel_slug,
      chapterNumber: row.chapter_number,
      parentId: row.parent_id,
      body: row.body,
      rating: row.rating ?? null,
      userId: row.user_id,
      username: embeddedUsername(row.author),
      likeCount: 0,
      likedByCurrentUser: false,
      isOwn: row.user_id === access!.userId,
      isTranslatorReply:
        row.parent_id != null &&
        publisherId != null &&
        row.user_id === publisherId,
      replies,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const repliesByParent = new Map<string, NovelComment[]>();
  for (const row of replyData ?? []) {
    if (!row.parent_id) continue;
    const list = repliesByParent.get(row.parent_id) ?? [];
    list.push(toComment(row));
    repliesByParent.set(row.parent_id, list);
  }

  const titleBySlug = new Map(novelRows.map((n) => [n.slug, n.title]));
  const groupsBySlug = new Map<string, NovelComment[]>();
  for (const row of topRows) {
    const comment = toComment(row, repliesByParent.get(row.id) ?? []);
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
        novels. Reply directly to
        start a thread.
        {commentsTruncated
          ? ` Showing the ${TOP_COMMENTS_LIMIT} most recent.`
          : null}
      </p>

      <div className="mt-6">
        <CommentsManager groups={groups} />
      </div>
    </PageContainer>
  );
}
