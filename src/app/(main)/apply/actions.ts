"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export type ApplyState = { error?: string; success?: boolean };

export async function submitTranslatorApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "You must be signed in to apply." };
  }

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? "";

  const discord = String(formData.get("discord") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!discord) return { error: "Enter your Discord username so we can reach you." };
  if (!message) return { error: "Add a short message about what you'd like to translate." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await supabase.from("translator_applications").insert({
    user_id: userId,
    username: profile?.username ?? "",
    email,
    discord,
    message,
  });

  if (error) {
    // Unique violation on user_id — they already applied.
    if (error.code === "23505") {
      return { error: "You have already submitted an application." };
    }
    return { error: error.message };
  }

  revalidatePath("/apply");
  return { success: true };
}
