"use server";

import { revalidatePath, updateTag } from "next/cache";

import { getAdminAccess } from "@/lib/access";
import { profileCacheTag } from "@/lib/data";
import { WORKSPACE_BASE } from "@/lib/workspace";
import { getServerSupabase } from "@/utils/supabase/auth";

export type ReviewState = { error?: string };

async function requireMasterAdmin(): Promise<string | null> {
  const access = await getAdminAccess();
  if (!access?.isMasterAdmin) return null;
  return access.userId;
}

async function reviewApplication(
  applicationId: string,
  status: "approved" | "rejected",
): Promise<ReviewState> {
  const reviewerId = await requireMasterAdmin();
  if (!reviewerId) return { error: "You are not authorized to review applications." };

  const supabase = await getServerSupabase();
  const { data: application } = await supabase
    .from("translator_applications")
    .select("username")
    .eq("id", applicationId)
    .maybeSingle();

  const { error } = await supabase.rpc("review_translator_application", {
    p_application_id: applicationId,
    p_status: status,
  });
  if (error) {
    return {
      error: error.message === "application not found"
        ? "Application not found."
        : error.message,
    };
  }

  if (status === "approved" && application?.username) {
    updateTag(profileCacheTag(application.username));
  }
  revalidatePath(`${WORKSPACE_BASE}/applications`);
  return {};
}

export async function approveApplication(
  applicationId: string,
): Promise<ReviewState> {
  return reviewApplication(applicationId, "approved");
}

export async function rejectApplication(
  applicationId: string,
): Promise<ReviewState> {
  return reviewApplication(applicationId, "rejected");
}
