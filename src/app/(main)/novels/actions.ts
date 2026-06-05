"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

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
