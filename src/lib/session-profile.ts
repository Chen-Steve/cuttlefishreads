import { cache } from "react";

import { isAdminEmail } from "@/lib/admin";
import { ensureOAuthProfile } from "@/lib/profile";
import {
  hasProfileRole,
  parseProfileRoles,
  type ProfileRole,
} from "@/lib/roles";
import { getAuthClaims, getServerSupabase } from "@/utils/supabase/auth";

export type SessionProfile = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  coins: number;
  roles: ProfileRole[];
  isAdmin: boolean;
  isTranslator: boolean;
};

/**
 * Request-scoped signed-in profile. Shared by the site header and page
 * loaders so auth + profiles are not fetched twice in one RSC render.
 */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const claims = await getAuthClaims();
    if (!claims) return null;

    const id = claims.sub as string;
    const email = claims.email as string | undefined;
    const supabase = await getServerSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, coins, avatar_url, role")
      .eq("id", id)
      .maybeSingle();

    let username = profile?.username ?? null;
    if (!username) {
      await ensureOAuthProfile(id, email);
      const { data: refreshed } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", id)
        .maybeSingle();
      username = refreshed?.username ?? null;
    }

    const roles = parseProfileRoles({
      role: profile?.role as string | null | undefined,
    });

    return {
      id,
      username,
      avatarUrl: profile?.avatar_url ?? null,
      coins: profile?.coins ?? 0,
      roles,
      isAdmin: isAdminEmail(email),
      isTranslator: hasProfileRole(roles, "translator"),
    };
  },
);
