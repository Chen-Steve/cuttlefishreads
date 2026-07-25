import { cache } from "react";
import { cookies } from "next/headers";

import { isStaleAuthSessionError } from "@/lib/auth-session";
import { createClient } from "@/utils/supabase/server";

/**
 * Request-scoped auth claims. Dedupes getClaims() across layouts and data
 * loaders so a near-expiry session is not refreshed multiple times in one RSC
 * render (which races single-use refresh tokens).
 */
export const getAuthClaims = cache(async () => {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.getClaims();

  if (error && isStaleAuthSessionError(error)) {
    // Middleware clears cookies; treat this render as logged out.
    return null;
  }

  return data?.claims ?? null;
});
