"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { getNovelComments, isChapterReadable } from "@/lib/data";
import type { NovelComment } from "@/types";
import { createClient } from "@/utils/supabase/server";

const MAX_COMMENT_LENGTH = 2000;

function validateCommentBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Comment cannot be empty.";
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`;
  }
  return null;
}

function revalidateCommentPaths(
  novelSlug: string,
  chapterNumber?: number | null,
) {
  revalidatePath(`/novels/${novelSlug}`);
  if (chapterNumber != null) {
    revalidatePath(`/novels/${novelSlug}/${chapterNumber}`);
  }
}

export type UnlockState = { error?: string; unlocked?: boolean };

// Spends coins to unlock a paid chapter for the signed-in user. The coin price
// is resolved server-side inside unlock_chapter() (SECURITY DEFINER), which
// deducts coins and records the chapter_unlocks row atomically.
export async function unlockChapter(
  novelSlug: string,
  chapterNumber: number,
): Promise<UnlockState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to unlock this chapter." };
  }

  const { data, error } = await supabase.rpc("unlock_chapter", {
    p_novel_slug: novelSlug,
    p_chapter_number: chapterNumber,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/novels/${novelSlug}/${chapterNumber}`);
  return { unlocked: data === true };
}

export type BulkUnlockState = {
  error?: string;
  unlockedCount?: number;
  coinsSpent?: number;
};

// Unlocks every remaining purchasable advanced chapter for a novel at list price.
// Pricing and eligibility are enforced inside bulk_unlock_chapters().
export async function bulkUnlockChapters(
  novelSlug: string,
): Promise<BulkUnlockState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to unlock chapters." };
  }

  const { data, error } = await supabase.rpc("bulk_unlock_chapters", {
    p_novel_slug: novelSlug,
  });

  if (error) {
    return { error: error.message };
  }

  const result = data as { unlocked_count: number; coins_spent: number } | null;
  revalidatePath(`/novels/${novelSlug}`);

  return {
    unlockedCount: result?.unlocked_count ?? 0,
    coinsSpent: result?.coins_spent ?? 0,
  };
}

export type BookmarkState = { error?: string; bookmarked?: boolean };

// Adds or removes a novel from the signed-in user's library. Returns the new
// bookmarked state so the client can update its UI optimistically.
export async function toggleBookmark(
  novelSlug: string,
): Promise<BookmarkState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to bookmark novels." };
  }

  const { data: novel, error: novelError } = await supabase
    .from("novels")
    .select("id")
    .eq("slug", novelSlug)
    .maybeSingle();

  if (novelError || !novel) {
    return { error: "Novel not found." };
  }

  const userId = auth.claims.sub;

  // Bookmarks are publicly readable for profiles — always scope by user_id
  // so we never toggle another reader's bookmark for the same novel.
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("novel_slug", novelSlug)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) return { error: error.message };

    revalidatePath(`/novels/${novelSlug}`);
    revalidatePath("/library");
    return { bookmarked: false };
  }

  const { error } = await supabase.from("bookmarks").insert({
    user_id: userId,
    novel_id: novel.id,
    novel_slug: novelSlug,
  });
  if (error) return { error: error.message };

  revalidatePath(`/novels/${novelSlug}`);
  revalidatePath("/library");
  return { bookmarked: true };
}

export type RemoveBookmarksState = { error?: string; removed?: number };

// Removes one or more bookmarks from the signed-in user's library.
export async function removeBookmarks(
  novelSlugs: string[],
): Promise<RemoveBookmarksState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to manage your library." };
  }

  const slugs = [...new Set(novelSlugs.map((slug) => slug.trim()).filter(Boolean))];
  if (slugs.length === 0) {
    return { error: "No bookmarks selected." };
  }

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", auth.claims.sub)
    .in("novel_slug", slugs);

  if (error) return { error: error.message };

  for (const slug of slugs) {
    revalidatePath(`/novels/${slug}`);
  }
  revalidatePath("/library");
  return { removed: slugs.length };
}

export type CommentState = { error?: string; comment?: NovelComment };

function parseOptionalRating(rating?: number | null): number | null | { error: string } {
  if (rating == null) return null;
  if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
    return { error: "Rating must be between 0 and 5 stars." };
  }
  return rating;
}

export async function createComment(
  novelSlug: string,
  body: string,
  chapterNumber?: number | null,
  rating?: number | null,
): Promise<CommentState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to comment." };
  }

  const bodyError = validateCommentBody(body);
  if (bodyError) return { error: bodyError };

  const parsedRating = parseOptionalRating(rating);
  if (parsedRating && typeof parsedRating === "object" && "error" in parsedRating) {
    return { error: parsedRating.error };
  }
  // Ratings only apply to general novel comments (not chapter-scoped).
  const ratingValue =
    chapterNumber == null ? (parsedRating as number | null) : null;

  if (chapterNumber != null) {
    const readable = await isChapterReadable(novelSlug, chapterNumber);
    if (!readable) {
      return { error: "You can only comment on chapters you can read." };
    }
  }

  const { data: novel, error: novelError } = await supabase
    .from("novels")
    .select("id")
    .eq("slug", novelSlug)
    .maybeSingle();

  if (novelError || !novel) {
    return { error: "Novel not found." };
  }

  const { data: inserted, error } = await supabase
    .from("novel_comments")
    .insert({
      user_id: auth.claims.sub,
      novel_id: novel.id,
      novel_slug: novelSlug,
      chapter_number: chapterNumber ?? null,
      body: body.trim(),
      rating: ratingValue,
    })
    .select(
      "id, novel_slug, chapter_number, body, rating, user_id, created_at, updated_at",
    )
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to post comment." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", auth.claims.sub)
    .maybeSingle();

  revalidateCommentPaths(novelSlug, chapterNumber);

  return {
    comment: {
      id: inserted.id,
      novelSlug: inserted.novel_slug,
      chapterNumber: inserted.chapter_number,
      parentId: null,
      body: inserted.body,
      rating: inserted.rating ?? null,
      userId: inserted.user_id,
      username: profile?.username ?? "Unknown",
      likeCount: 0,
      likedByCurrentUser: false,
      isOwn: true,
      isTranslatorReply: false,
      replies: [],
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    },
  };
}

export async function replyToComment(
  parentId: string,
  body: string,
): Promise<CommentState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to reply." };
  }

  const bodyError = validateCommentBody(body);
  if (bodyError) return { error: bodyError };

  const { data: parent, error: parentError } = await supabase
    .from("novel_comments")
    .select("id, novel_id, novel_slug, chapter_number, parent_id")
    .eq("id", parentId)
    .maybeSingle();

  if (parentError || !parent) {
    return { error: "Comment not found." };
  }

  if (parent.parent_id != null) {
    return { error: "You can only reply to a top-level comment." };
  }

  if (parent.chapter_number != null) {
    const readable = await isChapterReadable(
      parent.novel_slug,
      parent.chapter_number,
    );
    if (!readable) {
      return { error: "You can only reply on chapters you can read." };
    }
  }

  const userId = auth.claims.sub as string;

  const { data: inserted, error } = await supabase
    .from("novel_comments")
    .insert({
      user_id: userId,
      novel_id: parent.novel_id,
      novel_slug: parent.novel_slug,
      chapter_number: parent.chapter_number,
      parent_id: parent.id,
      body: body.trim(),
    })
    .select(
      "id, novel_slug, chapter_number, parent_id, body, user_id, created_at, updated_at",
    )
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to post reply." };
  }

  const [{ data: profile }, { data: novel }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    supabase
      .from("novels")
      .select("publisher_id")
      .eq("slug", parent.novel_slug)
      .maybeSingle(),
  ]);

  revalidateCommentPaths(parent.novel_slug, parent.chapter_number);
  revalidatePath("/account");

  return {
    comment: {
      id: inserted.id,
      novelSlug: inserted.novel_slug,
      chapterNumber: inserted.chapter_number,
      parentId: inserted.parent_id,
      body: inserted.body,
      rating: null,
      userId: inserted.user_id,
      username: profile?.username ?? "Unknown",
      likeCount: 0,
      likedByCurrentUser: false,
      isOwn: true,
      isTranslatorReply: novel?.publisher_id === userId,
      replies: [],
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    },
  };
}

export async function updateComment(
  commentId: string,
  body: string,
): Promise<CommentState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to edit comments." };
  }

  const bodyError = validateCommentBody(body);
  if (bodyError) return { error: bodyError };

  const { data: existing, error: fetchError } = await supabase
    .from("novel_comments")
    .select("novel_slug, chapter_number")
    .eq("id", commentId)
    .eq("user_id", auth.claims.sub)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Comment not found." };
  }

  const { error } = await supabase
    .from("novel_comments")
    .update({
      body: body.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("user_id", auth.claims.sub);

  if (error) return { error: error.message };

  revalidateCommentPaths(existing.novel_slug, existing.chapter_number);
  return {};
}

export async function deleteComment(commentId: string): Promise<CommentState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to delete comments." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("novel_comments")
    .select("novel_slug, chapter_number")
    .eq("id", commentId)
    .eq("user_id", auth.claims.sub)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Comment not found." };
  }

  const { error } = await supabase
    .from("novel_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", auth.claims.sub);

  if (error) return { error: error.message };

  revalidateCommentPaths(existing.novel_slug, existing.chapter_number);
  return {};
}

export type LikeState = { error?: string; liked?: boolean };

export async function toggleCommentLike(commentId: string): Promise<LikeState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to like comments." };
  }

  const { data: comment, error: commentError } = await supabase
    .from("novel_comments")
    .select("id, user_id, novel_slug, chapter_number")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError || !comment) {
    return { error: "Comment not found." };
  }

  const { data: existing } = await supabase
    .from("novel_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", auth.claims.sub)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("novel_comment_likes")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };

    revalidateCommentPaths(comment.novel_slug, comment.chapter_number);
    return { liked: false };
  }

  const { error } = await supabase.from("novel_comment_likes").insert({
    user_id: auth.claims.sub,
    comment_id: commentId,
  });
  if (error) return { error: error.message };

  revalidateCommentPaths(comment.novel_slug, comment.chapter_number);
  return { liked: true };
}

export type LoadMoreCommentsState = {
  error?: string;
  comments?: NovelComment[];
  hasMore?: boolean;
};

export async function loadMoreComments(
  novelSlug: string,
  offset: number,
): Promise<LoadMoreCommentsState> {
  const result = await getNovelComments(novelSlug, { limit: 50, offset });
  return {
    comments: result.comments,
    hasMore: result.hasMore,
  };
}
