import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import {
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryCookieOptions,
} from "@/lib/password-recovery";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${safeNext}`);

      if (safeNext === "/reset-password") {
        response.cookies.set(
          PASSWORD_RECOVERY_COOKIE,
          "1",
          passwordRecoveryCookieOptions
        );
      }

      return response;
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`
  );
}
