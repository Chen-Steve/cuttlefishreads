"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  isOriginalsDomain,
  mainOriginFromRequestHost,
  normalizeHost,
} from "@/lib/hosts";
import { absoluteUrl } from "@/lib/seo";
import { generateRandomUsername } from "@/lib/username";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/password-recovery";

export type AuthState = { error?: string; message?: string };

/** Prefer the current request host so Originals login stays on originals. */
async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host");
  if (!host) return absoluteUrl("/").replace(/\/$/, "");
  const forwarded = headerList.get("x-forwarded-proto");
  const proto =
    forwarded ??
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Next.js may optimize same-origin Server Action redirects into an internal
 * RSC fetch. Host-based rewrites can then resolve "/" as the main route tree.
 * Bounce Originals redirects through the main host so the browser performs a
 * full navigation; proxy.ts immediately canonicalizes it back to Originals.
 */
async function redirectAfterAuth(path: string): Promise<never> {
  const headerList = await headers();
  const hostHeader = headerList.get("host");

  if (isOriginalsDomain(normalizeHost(hostHeader))) {
    const url = new URL(mainOriginFromRequestHost(hostHeader));
    url.pathname = path === "/" ? "/originals" : `/originals${path}`;
    redirect(url.toString());
  }

  redirect(path);
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/account";

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return redirectAfterAuth(safeRedirect);
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  const username = generateRandomUsername();
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const userId = data.user?.id;
  if (userId) {
    const profileError = await ensureProfileWithUsername(userId, username);
    if (profileError) {
      // Auth user already exists — don't block signup; they can set a username later.
      console.error("[signup] failed to create profile:", profileError);
    }
  }

  revalidatePath("/", "layout");
  return redirectAfterAuth(safeRedirect);
}

/** Create/update profiles.username, retrying on rare unique collisions. */
async function ensureProfileWithUsername(
  userId: string,
  initialUsername: string
): Promise<string | undefined> {
  const admin = createAdminClient();
  let username = initialUsername;

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await admin.from("profiles").upsert(
      {
        id: userId,
        username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (!error) {
      if (attempt > 0) {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: { username },
        });
      }
      return undefined;
    }

    if (error.code !== "23505") {
      return error.message;
    }

    // Word combos first; append digits if the namespace is crowded.
    username = generateRandomUsername(attempt >= 3);
  }

  return "Could not assign a username. Please try again.";
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter your email." };
  }

  const supabase = createClient(await cookies());
  const origin = await requestOrigin();
  const callbackUrl = new URL(`${origin}/auth/callback`);
  callbackUrl.searchParams.set("next", "/reset-password");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function confirmPasswordReset(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password) {
    return { error: "Enter a new password." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== "1") {
    return {
      error: "Reset link expired or invalid. Request a new one and try again.",
    };
  }

  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return {
      error: "Reset link expired or invalid. Request a new one and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
  revalidatePath("/", "layout");
  return redirectAfterAuth("/account");
}

export async function signOut(formData?: FormData): Promise<void> {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  revalidatePath("/", "layout");

  const raw = formData
    ? String(formData.get("redirectTo") ?? "").trim()
    : "";

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return redirectAfterAuth(raw);
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      const allowed =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".localhost") ||
        host === "cuttlefishreads.com" ||
        host.endsWith(".cuttlefishreads.com");
      if (allowed && url.pathname === "/login") {
        redirect(raw);
      }
    } catch {
      // fall through
    }
  }

  return redirectAfterAuth("/login");
}

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const origin = await requestOrigin();
  const callbackUrl = new URL(`${origin}/auth/callback`);
  if (redirectTo?.startsWith("/")) {
    callbackUrl.searchParams.set("next", redirectTo);
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent("Google sign-in failed. Please try again.")}`
    );
  }

  redirect(data.url);
}
