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

export type BookmarkState = { error?: string; bookmarked?: boolean };

// Adds or removes a novel from the signed-in user's library. Returns the new
// bookmarked state so the client can update its UI optimistically.
export async function toggleBookmark(
  novelSlug: string,
): Promise<BookmarkState> {
  const supabase = createClient(await cookies());

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { error: "Please sign in to bookmark novels." };
  }

  const { data: novel, error: novelError } = await supabase
    .from("novels")
    .select("id")
    .eq("slug", novelSlug)
    .maybeSingle();

  if (novelError || !novel) {
    return { error: "Novel not found." };
  }

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("novel_slug", novelSlug)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };

    revalidatePath(`/novels/${novelSlug}`);
    revalidatePath("/library");
    return { bookmarked: false };
  }

  const { error } = await supabase.from("bookmarks").insert({
    user_id: auth.claims.sub,
    novel_id: novel.id,
    novel_slug: novelSlug,
  });
  if (error) return { error: error.message };

  revalidatePath(`/novels/${novelSlug}`);
  revalidatePath("/library");
  return { bookmarked: true };
}
