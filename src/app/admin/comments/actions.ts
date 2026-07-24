"use server";

import { revalidatePath } from "next/cache";

import { getAdminAccess, type AdminAccess } from "@/lib/access";
import { createAdminClient } from "@/utils/supabase/admin";
import type { NovelComment } from "@/types";

const MAX_COMMENT_LENGTH = 2000;

export type ReplyState = { error?: string; reply?: NovelComment };

// Translators may only act on novels they own (publisher_id === their id).
// Master admins can act on any novel.
function ownsNovel(access: AdminAccess, publisherId: string | null): boolean {
  return access.isMasterAdmin || publisherId === access.userId;
}

// Posts a translator reply to a reader comment. The reply is a child
// novel_comments row (parent_id = commentId) authored by the current user.
// Only the novel's publisher (or a master admin) may reply, and replies can
// only target top-level comments (no nested threads).
export async function replyToComment(
  commentId: string,
  body: string,
): Promise<ReplyState> {
  const access = await getAdminAccess();
  if (!access) {
    return { error: "You are not authorized to reply." };
  }

  const trimmed = body.trim();
  if (!trimmed) return { error: "Reply cannot be empty." };
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return { error: `Reply must be ${MAX_COMMENT_LENGTH} characters or fewer.` };
  }

  const admin = createAdminClient();

  const { data: parent, error: parentError } = await admin
    .from("novel_comments")
    .select(
      "id, novel_id, novel_slug, chapter_number, parent_id, novels(publisher_id)",
    )
    .eq("id", commentId)
    .maybeSingle<{
      id: string;
      novel_id: string;
      novel_slug: string;
      chapter_number: number | null;
      parent_id: string | null;
      novels: { publisher_id: string | null } | null;
    }>();

  if (parentError || !parent) {
    return { error: "Comment not found." };
  }

  if (parent.parent_id != null) {
    return { error: "You can only reply to a top-level comment." };
  }

  if (!ownsNovel(access, parent.novels?.publisher_id ?? null)) {
    return { error: "You can only reply to comments on your own novels." };
  }

  const { data: inserted, error } = await admin
    .from("novel_comments")
    .insert({
      user_id: access.userId,
      novel_id: parent.novel_id,
      novel_slug: parent.novel_slug,
      chapter_number: parent.chapter_number,
      parent_id: parent.id,
      body: trimmed,
    })
    .select("id, novel_slug, chapter_number, parent_id, body, user_id, created_at, updated_at")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to post reply." };
  }

  revalidatePath(`/novels/${parent.novel_slug}`);
  if (parent.chapter_number != null) {
    revalidatePath(`/novels/${parent.novel_slug}/${parent.chapter_number}`);
  }
  revalidatePath("/admin/comments");
  revalidatePath("/originals/workspace/comments");

  return {
    reply: {
      id: inserted.id,
      novelSlug: inserted.novel_slug,
      chapterNumber: inserted.chapter_number,
      parentId: inserted.parent_id,
      body: inserted.body,
      rating: null,
      userId: inserted.user_id,
      username: access.username ?? "You",
      likeCount: 0,
      likedByCurrentUser: false,
      isOwn: true,
      isTranslatorReply: true,
      replies: [],
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    },
  };
}
