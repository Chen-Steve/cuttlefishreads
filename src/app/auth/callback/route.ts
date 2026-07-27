import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  authCookieOptionsForHost,
  mergeAuthCookieOptions,
} from "@/lib/auth-cookies";
import {
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryCookieOptions,
} from "@/lib/password-recovery";
import { ensureOAuthProfile } from "@/lib/profile";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";
  const host = request.headers.get("host");

  if (code) {
    // Write session cookies onto the redirect response. Using cookies() from
    // next/headers alone can drop Set-Cookie on a newly constructed redirect.
    const redirectResponse = NextResponse.redirect(`${origin}${safeNext}`);

    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
      cookieOptions: authCookieOptionsForHost(host),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(
              name,
              value,
              mergeAuthCookieOptions(options, host),
            );
          });
          Object.entries(headers).forEach(([key, value]) =>
            redirectResponse.headers.set(key, value),
          );
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user?.id) {
        await ensureOAuthProfile(data.user.id, data.user.email);
      }

      if (safeNext === "/reset-password") {
        redirectResponse.cookies.set(
          PASSWORD_RECOVERY_COOKIE,
          "1",
          passwordRecoveryCookieOptions,
        );
      }

      return redirectResponse;
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`,
  );
}
