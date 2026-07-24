import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  authCookieOptionsForHost,
  mergeAuthCookieOptions,
} from "@/lib/auth-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Host used for shared cookie Domain.
 * Prod SITE_URL → .cuttlefishreads.com (covers main + originals + creators).
 */
function defaultAuthHost(): string | null {
  if (process.env.NODE_ENV === "development") {
    return "localhost:3000";
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return null;
  try {
    return new URL(site).host;
  } catch {
    return null;
  }
}

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) => {
  const host = defaultAuthHost();

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookieOptions: authCookieOptionsForHost(host) as CookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(
              name,
              value,
              mergeAuthCookieOptions(options, host),
            ),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // Middleware refreshes user sessions.
        }
      },
    },
  });
};
