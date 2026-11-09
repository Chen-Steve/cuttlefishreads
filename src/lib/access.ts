import { cache } from "react";

import { adminEmailList } from "@/lib/admin";
import type { ProfileRole } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAuthClaims } from "@/utils/supabase/auth";

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
 * Workspace view of the request's signed-in profile. Same row as the header.
 * Translator role is set when an application is approved, not on this read.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess | null> => {
  const session = await getSessionProfile();
  if (!session) return null;

  await syncAdminAllowlist();
  const claims = await getAuthClaims();

  return {
    userId: session.id,
    email: typeof claims?.email === "string" ? claims.email : undefined,
    username: session.username,
    roles: session.roles,
    isMasterAdmin: session.isAdmin,
    isTranslator: session.isTranslator,
    hasWorkspace: session.isAdmin || session.isTranslator,
  };
});
