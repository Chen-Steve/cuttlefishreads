"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { absoluteUrl } from "@/lib/seo";
import { ensureProfileWithUsername } from "@/lib/profile";
import { generateRandomUsername } from "@/lib/username";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/password-recovery";

export type AuthState = { error?: string; message?: string };

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

function redirectAfterAuth(path: string): never {
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

  return redirectAfterAuth(safeRedirect);
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
  return redirectAfterAuth("/account");
}

export async function signOut(formData?: FormData): Promise<void> {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();

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
