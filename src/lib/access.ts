import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export type WorkspaceRole = "user" | "translator";

export type AdminAccess = {
  userId: string;
  email: string | undefined;
  username: string | null;
  role: WorkspaceRole;
  // Master admin from the ADMIN_EMAILS env allowlist — full, unscoped access.
  isMasterAdmin: boolean;
  // Approved translator with a scoped workspace (own novels only).
  isTranslator: boolean;
  // Anyone allowed into the /admin workspace (master admin or translator).
  hasWorkspace: boolean;
};

// Workspace access is driven by profiles.role, but an approved application can
// drift out of sync (e.g. approval ran before a profile row existed). When that
// happens, sync the profile and treat the user as a translator.
async function resolveWorkspaceRole(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  profileRole: string | undefined,
): Promise<WorkspaceRole> {
  if (profileRole === "translator") return "translator";

  const { data: application } = await admin
    .from("translator_applications")
    .select("status, username")
    .eq("user_id", userId)
    .maybeSingle();

  if (application?.status !== "approved") return "user";

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
  }

  return "translator";
}

// Resolves the current request's workspace access from the validated JWT plus
// the profiles role. Returns null when no authenticated user is present.
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
    .select("username, role")
    .eq("id", userId)
    .maybeSingle();

  const role: WorkspaceRole =
    profile?.role === "translator"
      ? "translator"
      : isMasterAdmin
        ? "user"
        : await resolveWorkspaceRole(admin, userId, profile?.role);
  const isTranslator = role === "translator";

  return {
    userId,
    email,
    username: profile?.username ?? null,
    role,
    isMasterAdmin,
    isTranslator,
    hasWorkspace: isMasterAdmin || isTranslator,
  };
}
