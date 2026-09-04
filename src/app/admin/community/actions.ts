"use server";

import { revalidatePath } from "next/cache";

import { getAdminAccess } from "@/lib/access";
import type { CommunityPostStatus } from "@/types";
import { createAdminClient } from "@/utils/supabase/admin";

export type CommunityAdminState = { error?: string };

const STATUSES: CommunityPostStatus[] = [
  "open",
  "planned",
  "done",
  "declined",
];

function revalidateCommunity() {
  revalidatePath("/community");
  revalidatePath("/admin/community");
}

export async function updateCommunityPostStatus(
  postId: string,
  status: string,
): Promise<CommunityAdminState> {
  const access = await getAdminAccess();
  if (!access?.isMasterAdmin) {
    return { error: "You are not authorized to moderate the board." };
  }
  if (!STATUSES.includes(status as CommunityPostStatus)) {
    return { error: "Invalid status." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) return { error: error.message };
  revalidateCommunity();
  return {};
}

export async function deleteCommunityPostAsAdmin(
  postId: string,
): Promise<CommunityAdminState> {
  const access = await getAdminAccess();
  if (!access?.isMasterAdmin) {
    return { error: "You are not authorized to moderate the board." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) return { error: error.message };
  revalidateCommunity();
  return {};
}
