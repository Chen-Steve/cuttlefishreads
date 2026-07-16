"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
  normalizeUsername,
} from "@/lib/username";

export type UsernameState = { error?: string; message?: string };

export async function updateUsername(
  _prevState: UsernameState,
  formData: FormData
): Promise<UsernameState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  if (!username) {
    return { error: "Username cannot be empty." };
  }

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return {
      error: `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores." };
  }

  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", data.claims.sub);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { message: "Username updated." };
}
