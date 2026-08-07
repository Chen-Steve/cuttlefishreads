import { cache } from "react";

import { createAdminClient } from "@/utils/supabase/admin";
import { getAuthClaims } from "@/utils/supabase/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  isTranslatorRole,
  parseProfileRoles,
  storedRoleFromFlags,
  type ProfileRole,
} from "@/lib/roles";

export type AdminAccess = {
  userId: string;
  email: string | undefined;
  username: string | null;
  /** Granted profile roles derived from profiles.role. */
  roles: ProfileRole[];
  // Master admin from the ADMIN_EMAILS env allowlist — full, unscoped access.
  isMasterAdmin: boolean;
  // Approved translator (main catalog translations).
  isTranslator: boolean;
  // Translator workspace (/admin) — master or approved translator.
  hasWorkspace: boolean;
};

// Workspace access is driven by profiles.role, but an approved translator
// application can drift out of sync (e.g. approval ran before a profile row
// existed). When that happens, sync the profile and treat them as translator.
async function ensureTranslatorApplicationRole(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  isTranslator: boolean,
): Promise<boolean> {
  if (isTranslator) return true;

  const { data: application } = await admin
    .from("translator_applications")
    .select("status, username")
    .eq("user_id", userId)
    .maybeSingle();

  if (application?.status !== "approved") return false;

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "translator",
      username: application.username || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[getAdminAccess] failed to sync translator role:", error);
    return false;
  }

  return true;
}

/**
 * Current request's access from JWT + profile. Null when logged out.
 * Request-scoped via React cache so layout + page share one lookup.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess | null> => {
  const claims = await getAuthClaims();
  if (!claims) return null;

  const userId = claims.sub as string;
  const email = claims.email as string | undefined;
  const isMasterAdmin = isAdminEmail(email);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("username, role")
    .eq("id", userId)
    .maybeSingle();

  let isTranslator = isTranslatorRole(profile?.role as string | null | undefined);

  if (!isMasterAdmin) {
    isTranslator = await ensureTranslatorApplicationRole(
      admin,
      userId,
      isTranslator,
    );
  }

  const roles = parseProfileRoles({
    role: isTranslator ? "translator" : "user",
  });

  return {
    userId,
    email,
    username: profile?.username ?? null,
    roles,
    isMasterAdmin,
    isTranslator,
    hasWorkspace: isMasterAdmin || isTranslator,
  };
});

/** Grant translator access via profiles.role. */
export async function grantProfileRole(
  userId: string,
  role: ProfileRole,
  username?: string | null,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, username")
    .eq("id", userId)
    .maybeSingle();

  const alreadyTranslator = isTranslatorRole(
    profile?.role as string | null | undefined,
  );
  const nextTranslator = role === "translator" || alreadyTranslator;

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: storedRoleFromFlags(nextTranslator),
      username: username || profile?.username || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };
  return {};
}
