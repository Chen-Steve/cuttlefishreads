import { cache } from "react";

import { adminEmailList, isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";
import { isTranslatorRole, parseProfileRoles, type ProfileRole } from "@/lib/roles";

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
  // Translator workspace (/workspace) — master or approved translator.
  hasWorkspace: boolean;
};

let syncedAdminEmails: string | null = null;

/**
 * Copies ADMIN_EMAILS into the database so row-level policies can see it.
 * Content writes do not use the service role; this allowlist sync is the
 * exception, and it no-ops until the list changes.
 */
export async function syncAdminAllowlist(): Promise<void> {
  const emails = adminEmailList();
  const key = emails.join("\n");
  if (syncedAdminEmails === key) return;

  const { error } = await createAdminClient().rpc("sync_admin_emails", {
    p_emails: emails,
  });
  if (error) {
    console.error("[syncAdminAllowlist]", error);
    return;
  }
  syncedAdminEmails = key;
}

/** Publisher of the novel, or a master admin. */
export function ownsNovel(
  access: AdminAccess,
  publisherId: string | null,
): boolean {
  return access.isMasterAdmin || publisherId === access.userId;
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

  await syncAdminAllowlist();
  const supabase = await getServerSupabase();
  let { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", userId)
    .maybeSingle();

  let isTranslator = isTranslatorRole(profile?.role as string | null | undefined);

  // Approved applications can land before the profile role is set. The
  // database promotes the caller only when that approved row exists.
  if (!isMasterAdmin && !isTranslator) {
    const { data: synced, error } = await supabase.rpc("sync_own_translator_role");
    if (error) {
      console.error("[getAdminAccess] failed to sync translator role:", error);
    } else if (synced === true) {
      isTranslator = true;
      if (!profile?.username) {
        const { data: refreshed } = await supabase
          .from("profiles")
          .select("username, role")
          .eq("id", userId)
          .maybeSingle();
        profile = refreshed;
      }
    }
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
