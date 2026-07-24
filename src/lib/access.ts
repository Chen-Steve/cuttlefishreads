import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import {
  hasProfileRole,
  legacyRoleFromRoles,
  parseProfileRoles,
  withProfileRole,
  type ProfileRole,
} from "@/lib/roles";

export type AdminAccess = {
  userId: string;
  email: string | undefined;
  username: string | null;
  /** Granted profile roles (currently just translator). */
  roles: ProfileRole[];
  // Master admin from the ADMIN_EMAILS env allowlist — full, unscoped access.
  isMasterAdmin: boolean;
  // Approved translator (main catalog translations).
  isTranslator: boolean;
  // Translator workspace (/admin) — master or approved translator.
  hasWorkspace: boolean;
};

// Workspace access is driven by profiles.roles, but an approved translator
// application can drift out of sync (e.g. approval ran before a profile row
// existed). When that happens, sync the profile and treat them as translator.
async function ensureTranslatorApplicationRole(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  currentRoles: ProfileRole[],
): Promise<ProfileRole[]> {
  if (currentRoles.includes("translator")) return currentRoles;

  const { data: application } = await admin
    .from("translator_applications")
    .select("status, username")
    .eq("user_id", userId)
    .maybeSingle();

  if (application?.status !== "approved") return currentRoles;

  const nextRoles = withProfileRole(currentRoles, "translator");
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      roles: nextRoles,
      role: legacyRoleFromRoles(nextRoles),
      username: application.username || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[getAdminAccess] failed to sync translator role:", error);
    return currentRoles;
  }

  return nextRoles;
}

/** Current request's access from JWT + profile. Null when logged out. */
export async function getAdminAccess(): Promise<AdminAccess | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const userId = claims.sub as string;
  const email = claims.email as string | undefined;
  const isMasterAdmin = isAdminEmail(email);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("username, role, roles")
    .eq("id", userId)
    .maybeSingle();

  let roles = parseProfileRoles({
    roles: profile?.roles as string[] | null | undefined,
    role: profile?.role as string | null | undefined,
  });

  if (!isMasterAdmin) {
    roles = await ensureTranslatorApplicationRole(admin, userId, roles);
  }

  const isTranslator = hasProfileRole(roles, "translator");

  return {
    userId,
    email,
    username: profile?.username ?? null,
    roles,
    isMasterAdmin,
    isTranslator,
    hasWorkspace: isMasterAdmin || isTranslator,
  };
}

/** Grant a role without removing any existing ones. */
export async function grantProfileRole(
  userId: string,
  role: ProfileRole,
  username?: string | null,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("roles, role, username")
    .eq("id", userId)
    .maybeSingle();

  const existing = parseProfileRoles({
    roles: profile?.roles as string[] | null | undefined,
    role: profile?.role as string | null | undefined,
  });
  const nextRoles = withProfileRole(existing, role);

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      roles: nextRoles,
      role: legacyRoleFromRoles(nextRoles),
      username: username || profile?.username || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };
  return {};
}
