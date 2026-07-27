import { createAdminClient } from "@/utils/supabase/admin";
import {
  deriveUsernameFromEmail,
  generateRandomUsername,
} from "@/lib/username";

/** Create/update profiles.username, retrying on rare unique collisions. */
export async function ensureProfileWithUsername(
  userId: string,
  initialUsername: string,
  options?: { onlyIfMissing?: boolean },
): Promise<string | undefined> {
  const admin = createAdminClient();

  if (options?.onlyIfMissing) {
    const { data: existing } = await admin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (existing?.username) return undefined;
  }

  let username = initialUsername;

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await admin.from("profiles").upsert(
      {
        id: userId,
        username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (!error) {
      if (attempt > 0) {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: { username },
        });
      }
      return undefined;
    }

    if (error.code !== "23505") {
      return error.message;
    }

    // Word combos first; append digits if the namespace is crowded.
    username = generateRandomUsername(attempt >= 3);
  }

  return "Could not assign a username. Please try again.";
}

/** Assign a profile username for OAuth sign-ins when one is still missing. */
export async function ensureOAuthProfile(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  const derived = email ? deriveUsernameFromEmail(email) : null;
  const username = derived ?? generateRandomUsername();
  const error = await ensureProfileWithUsername(userId, username, {
    onlyIfMissing: true,
  });

  if (error) {
    console.error("[ensureOAuthProfile] failed to create profile:", error);
  }
}
