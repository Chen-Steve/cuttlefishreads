"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
  normalizeUsername,
} from "@/lib/username";

export type UsernameState = { error?: string; message?: string };
export type AvatarState = { error?: string; message?: string };
export type PasswordState = { error?: string; message?: string };

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function resolveAvatarFile(
  avatarFile: File | null | undefined,
  formData: FormData,
): File | null {
  if (avatarFile instanceof File && avatarFile.size > 0) return avatarFile;
  const fromForm = formData.get("avatar");
  if (fromForm instanceof File && fromForm.size > 0) return fromForm;
  return null;
}

function validateAvatarFile(file: File): string | null {
  if (file.size > MAX_AVATAR_BYTES) {
    return `Image is too large (max ${MAX_AVATAR_BYTES / 1024 / 1024} MB).`;
  }
  if (file.type && !file.type.startsWith("image/")) {
    return "Profile picture must be an image file (JPEG, PNG, WebP, or GIF).";
  }
  return null;
}

function avatarPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/avatars/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

async function deleteAvatarObject(
  admin: ReturnType<typeof createAdminClient>,
  url: string | null | undefined,
) {
  const path = avatarPathFromUrl(url);
  if (!path) return;
  await admin.storage.from("avatars").remove([path]);
}

export async function updateUsername(
  _prevState: UsernameState,
  formData: FormData
): Promise<UsernameState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  if (!username) {
    return { error: "Username cannot be empty." };
  }

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return {
      error: `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores." };
  }

  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", data.claims.sub);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/originals/account");
  revalidatePath("/", "layout");
  revalidatePath(`/creator/${username}`);
  revalidatePath(`/profiles/${username}`);
  return { message: "Username updated." };
}

export async function updateAvatar(
  avatarFile: File | null,
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "You must be logged in." };
  }

  const file = resolveAvatarFile(avatarFile, formData);
  if (!file) {
    return { error: "Choose an image to upload." };
  }

  const validationError = validateAvatarFile(file);
  if (validationError) return { error: validationError };

  const userId = data.claims.sub as string;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("avatar_url, username")
    .eq("id", userId)
    .maybeSingle();

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() || "jpg"
    : "jpg";
  const path = `${userId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    await admin.storage.from("avatars").remove([path]);
    return { error: updateError.message };
  }

  await deleteAvatarObject(admin, existing?.avatar_url);

  revalidatePath("/account");
  revalidatePath("/originals/account");
  revalidatePath("/", "layout");
  if (existing?.username) {
    revalidatePath(`/u/${existing.username}`);
    revalidatePath(`/creator/${existing.username}`);
    revalidatePath(`/profiles/${existing.username}`);
  }

  return { message: "Profile picture updated." };
}

export async function updatePassword(
  _prevState: PasswordState,
  formData: FormData
): Promise<PasswordState> {
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

  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { message: "Password updated." };
}

export async function removeAvatar(): Promise<AvatarState> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "You must be logged in." };
  }

  const userId = data.claims.sub as string;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("avatar_url, username")
    .eq("id", userId)
    .maybeSingle();

  if (!existing?.avatar_url) {
    return { error: "No profile picture to remove." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (error) return { error: error.message };

  await deleteAvatarObject(admin, existing.avatar_url);

  revalidatePath("/account");
  revalidatePath("/originals/account");
  revalidatePath("/", "layout");
  if (existing.username) {
    revalidatePath(`/u/${existing.username}`);
    revalidatePath(`/creator/${existing.username}`);
    revalidatePath(`/profiles/${existing.username}`);
  }

  return { message: "Profile picture removed." };
}
