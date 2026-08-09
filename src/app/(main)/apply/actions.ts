"use server";

import { revalidatePath } from "next/cache";

import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";

export type ApplyState = { error?: string; success?: boolean };

export async function submitTranslatorApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: "You must be signed in to apply." };
  }

  const supabase = await getServerSupabase();
  const userId = claims.sub as string;
  const email = (claims.email as string | undefined) ?? "";

  const discord = String(formData.get("discord") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!discord) return { error: "Enter your Discord username so we can reach you." };
  if (!message) {
    return { error: "Add a short message about what you'd like to translate." };
  }

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
    if (error.code === "23505") {
      return { error: "You have already submitted an application." };
    }
    return { error: error.message };
  }

  revalidatePath("/apply");
  return { success: true };
}
