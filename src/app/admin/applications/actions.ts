"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";

export type ReviewState = { error?: string };

async function requireMasterAdmin(): Promise<string | null> {
  const access = await getAdminAccess();
  if (!access?.isMasterAdmin) return null;
  return access.userId;
}

export async function approveApplication(
  applicationId: string,
): Promise<ReviewState> {
  const reviewerId = await requireMasterAdmin();
  if (!reviewerId) return { error: "You are not authorized to review applications." };

  const admin = createAdminClient();

  const { data: application } = await admin
    .from("translator_applications")
    .select("id, user_id, status, username")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return { error: "Application not found." };

  // Grant the translator role first so an approved status is never out of sync
  // with the actual permission. Upsert so approval still works when the user
  // has no profiles row yet (update alone would silently no-op).
  const { error: roleError } = await admin.from("profiles").upsert(
    {
      id: application.user_id,
      role: "translator",
      username: application.username || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (roleError) return { error: roleError.message };

  const { error } = await admin
    .from("translator_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/admin/applications");
  return {};
}

export async function rejectApplication(
  applicationId: string,
): Promise<ReviewState> {
  const reviewerId = await requireMasterAdmin();
  if (!reviewerId) return { error: "You are not authorized to review applications." };

  const admin = createAdminClient();

  const { error } = await admin
    .from("translator_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/admin/applications");
  return {};
}
