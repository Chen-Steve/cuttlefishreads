"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import { absoluteUrl } from "@/lib/seo";

export type AuthState = { error?: string; message?: string };

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
  redirect(safeRedirect);
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
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

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect);
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
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const callbackUrl = new URL(absoluteUrl("/auth/callback"));
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
