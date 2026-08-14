"use server";

import { revalidatePath } from "next/cache";

import {
  COMMUNITY_BODY_MAX,
  COMMUNITY_DAILY_LIMIT,
  COMMUNITY_TITLE_MAX,
} from "@/lib/community-constants";
import type { CommunityPost, CommunityPostKind, CommunityPostStatus } from "@/types";
import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";

export type CommunityActionState = {
  error?: string;
  post?: CommunityPost;
  voted?: boolean;
};

function revalidateCommunity() {
  revalidatePath("/");
  revalidatePath("/community");
  revalidatePath("/admin/community");
}

function parseKind(value: string): CommunityPostKind | null {
  if (value === "novel_request" || value === "idea") return value;
  return null;
}

function parseStatus(value: string): CommunityPostStatus {
  if (value === "planned" || value === "done" || value === "declined") {
    return value;
  }
  return "open";
}

export async function createCommunityPost(
  kindValue: string,
  titleValue: string,
  bodyValue: string,
): Promise<CommunityActionState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "Sign in to post." };
  }

  const kind = parseKind(kindValue);
  if (!kind) return { error: "Invalid post type." };

  const title = titleValue.trim();
  const body = bodyValue.trim();

  if (title.length < 2) {
    return { error: "Give it a title of at least 2 characters." };
  }
  if (title.length > COMMUNITY_TITLE_MAX) {
    return { error: `Keep the title under ${COMMUNITY_TITLE_MAX} characters.` };
  }
  if (body.length > COMMUNITY_BODY_MAX) {
    return { error: `Keep the details under ${COMMUNITY_BODY_MAX} characters.` };
  }

  const supabase = await getServerSupabase();
  const userId = claims.sub as string;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (countError) return { error: countError.message };
  if ((count ?? 0) >= COMMUNITY_DAILY_LIMIT) {
    return { error: "You've hit today's post limit. Try again tomorrow." };
  }

  const { data: inserted, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: userId,
      kind,
      title,
      body,
    })
    .select("id, user_id, kind, title, body, status, vote_count, created_at")
    .single();

  if (error || !inserted) {
    if (error?.code === "23505") {
      return {
        error: "That novel is already on the board — upvote it instead.",
      };
    }
    return { error: error?.message ?? "Could not post." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  revalidateCommunity();

  return {
    post: {
      id: inserted.id,
      kind,
      title: inserted.title,
      body: inserted.body,
      status: parseStatus(inserted.status),
      voteCount: Number(inserted.vote_count) || 1,
      votedByCurrentUser: true,
      userId,
      username: profile?.username ?? "Unknown",
      isOwn: true,
      createdAt: inserted.created_at,
    },
  };
}

export async function toggleCommunityVote(
  postId: string,
): Promise<CommunityActionState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "Sign in to vote." };
  }

  const supabase = await getServerSupabase();
  const userId = claims.sub as string;

  const { data: post, error: postError } = await supabase
    .from("community_posts")
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post) return { error: "Post not found." };

  const { data: existing } = await supabase
    .from("community_post_votes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_post_votes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
    revalidateCommunity();
    return { voted: false };
  }

  const { error } = await supabase.from("community_post_votes").insert({
    post_id: postId,
    user_id: userId,
  });
  if (error) return { error: error.message };

  revalidateCommunity();
  return { voted: true };
}

export async function deleteCommunityPost(
  postId: string,
): Promise<CommunityActionState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "Sign in to delete a post." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", claims.sub);

  if (error) return { error: error.message };

  revalidateCommunity();
  return {};
}
