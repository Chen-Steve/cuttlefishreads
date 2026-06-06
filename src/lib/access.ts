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

  const role: WorkspaceRole = profile?.role === "translator" ? "translator" : "user";
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
