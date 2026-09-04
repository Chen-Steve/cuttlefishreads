"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getAuthClaims } from "@/utils/supabase/auth";
import { createClient } from "@/utils/supabase/server";

export type NotificationActionState = { error?: string };

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationActionState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "Please sign in." };
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", claims.sub)
    .is("read_at", null)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  return {};
}

export async function markAllNotificationsRead(): Promise<NotificationActionState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "Please sign in." };
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", claims.sub)
    .is("read_at", null)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  return {};
}

export async function deleteNotification(
  notificationId: string,
): Promise<NotificationActionState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "Please sign in." };
  }

  const supabase = createClient(await cookies());
  // Soft-dismiss so timed chapter_released rematerialization cannot recreate it.
  const { error } = await supabase
    .from("notifications")
    .update({
      dismissed_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", claims.sub)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  return {};
}

export async function deleteAllNotifications(): Promise<NotificationActionState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "Please sign in." };
  }

  const supabase = createClient(await cookies());
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: now, read_at: now })
    .eq("user_id", claims.sub)
    .is("dismissed_at", null);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  return {};
}
