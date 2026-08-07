"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export type NotificationActionState = { error?: string };

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationActionState> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "Please sign in." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", data.claims.sub)
    .is("read_at", null)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return {};
}

export async function markAllNotificationsRead(): Promise<NotificationActionState> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "Please sign in." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", data.claims.sub)
    .is("read_at", null)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return {};
}

export async function deleteNotification(
  notificationId: string,
): Promise<NotificationActionState> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "Please sign in." };
  }

  // Soft-dismiss so timed chapter_released rematerialization cannot recreate it.
  const { error } = await supabase
    .from("notifications")
    .update({
      dismissed_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", data.claims.sub)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return {};
}

export async function deleteAllNotifications(): Promise<NotificationActionState> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "Please sign in." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: now, read_at: now })
    .eq("user_id", data.claims.sub)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return {};
}

/** @deprecated Use markNotificationRead */
export const markCommentNotificationRead = markNotificationRead;
/** @deprecated Use markAllNotificationsRead */
export const markAllCommentNotificationsRead = markAllNotificationsRead;
