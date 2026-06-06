"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import { GENRES, type Genre } from "@/lib/constants";

export type AdminState = { error?: string };

const NOVEL_STATUSES = ["ongoing", "completed", "hiatus"] as const;
type NovelStatus = (typeof NOVEL_STATUSES)[number];

async function requireAdmin(): Promise<AdminState | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;
  if (!data?.claims || !isAdminEmail(email)) {
    return { error: "You are not authorized to perform this action." };
  }
  return null;
}

function parseGenres(formData: FormData): Genre[] {
  const allowed = new Set<string>(GENRES);
  return formData
    .getAll("genres")
    .map(String)
    .filter((g) => allowed.has(g)) as Genre[];
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

async function uploadCover(
  admin: ReturnType<typeof createAdminClient>,
  slug: string,
  file: File | null,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${slug}-${Date.now()}.${ext}`;

  const { error } = await admin.storage
    .from("covers")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (error) {
    throw new Error(`Cover upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("covers").getPublicUrl(path);
  return publicUrl;
}

export async function createNovel(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const originalAuthor = String(formData.get("originalAuthor") ?? "").trim();
  const translator = String(formData.get("translator") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "ongoing");
  const status: NovelStatus = NOVEL_STATUSES.includes(statusRaw as NovelStatus)
    ? (statusRaw as NovelStatus)
    : "ongoing";
  const genres = parseGenres(formData);
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const cover = formData.get("cover");
  const publisherUsername = String(formData.get("publisherUsername") ?? "").trim();

  const admin = createAdminClient();

  let publisherId: string | null = null;
  if (publisherUsername) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", publisherUsername)
      .maybeSingle();
    if (!profile) return { error: `No user found with username "${publisherUsername}".` };
    publisherId = profile.id;
  }

  const base = slugify(title) || "novel";
  let slug = base;
  for (let i = 2; ; i += 1) {
    const { data: existing } = await admin
      .from("novels")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${i}`;
  }

  let coverUrl: string | null = null;
  try {
    coverUrl = await uploadCover(
      admin,
      slug,
      cover instanceof File ? cover : null,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Cover upload failed." };
  }

  const { error } = await admin.from("novels").insert({
    slug,
    title,
    original_author: originalAuthor || null,
    translator: translator || null,
    description: description || null,
    cover_url: coverUrl,
    genres,
    tags,
    status,
    publisher_id: publisherId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateNovel(
  novelId: string,
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const originalAuthor = String(formData.get("originalAuthor") ?? "").trim();
  const translator = String(formData.get("translator") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "ongoing");
  const status: NovelStatus = NOVEL_STATUSES.includes(statusRaw as NovelStatus)
    ? (statusRaw as NovelStatus)
    : "ongoing";
  const genres = parseGenres(formData);
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const cover = formData.get("cover");
  const publisherUsername = String(formData.get("publisherUsername") ?? "").trim();

  const admin = createAdminClient();

  let publisherId: string | null = null;
  if (publisherUsername) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", publisherUsername)
      .maybeSingle();
    if (!profile) return { error: `No user found with username "${publisherUsername}".` };
    publisherId = profile.id;
  }

  const { data: existing } = await admin
    .from("novels")
    .select("id, slug, cover_url")
    .eq("id", novelId)
    .maybeSingle();

  if (!existing) return { error: "That novel no longer exists." };

  let coverUrl = existing.cover_url;
  if (cover instanceof File && cover.size > 0) {
    try {
      const uploaded = await uploadCover(admin, existing.slug, cover);
      if (uploaded) coverUrl = uploaded;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Cover upload failed." };
    }
  }

  const { error } = await admin
    .from("novels")
    .update({
      title,
      original_author: originalAuthor || null,
      translator: translator || null,
      description: description || null,
      cover_url: coverUrl,
      genres,
      tags,
      status,
      publisher_id: publisherId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", novelId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/novels");
  revalidatePath(`/novels/${existing.slug}`);
  redirect("/admin");
}

export async function deleteNovel(novelId: string): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("novels")
    .select("slug")
    .eq("id", novelId)
    .maybeSingle();

  if (!existing) return { error: "That novel no longer exists." };

  const { error } = await admin.from("novels").delete().eq("id", novelId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/novels");
  revalidatePath(`/novels/${existing.slug}`);
  redirect("/admin");
}

export async function createChapter(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const novelId = String(formData.get("novelId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!novelId) return { error: "Choose a novel." };
  if (!title) return { error: "Chapter title is required." };
  if (!content) return { error: "Chapter content is required." };

  const access = String(formData.get("access") ?? "free");
  const isFree = access !== "paid";
  const coinCost = isFree ? 0 : Math.floor(Number(formData.get("coinCost") ?? 0));

  if (!isFree && (!Number.isFinite(coinCost) || coinCost < 1)) {
    return { error: "Paid chapters need a coin cost of at least 1." };
  }

  const unlockAtRaw = String(formData.get("unlockAt") ?? "").trim();
  let unlockAt: string | null = null;
  if (unlockAtRaw) {
    const date = new Date(unlockAtRaw);
    if (Number.isNaN(date.getTime())) {
      return { error: "Auto-unlock date is invalid." };
    }
    unlockAt = date.toISOString();
  }

  const admin = createAdminClient();

  const { data: novel } = await admin
    .from("novels")
    .select("id, title")
    .eq("id", novelId)
    .maybeSingle();
  if (!novel) return { error: "That novel no longer exists." };

  let number = Math.floor(Number(formData.get("number") ?? 0));
  if (!Number.isFinite(number) || number < 1) {
    const { data: last } = await admin
      .from("chapters")
      .select("number")
      .eq("novel_id", novelId)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();
    number = (last?.number ?? 0) + 1;
  }

  const { error } = await admin.from("chapters").insert({
    novel_id: novelId,
    number,
    title,
    content,
    is_free: isFree,
    coin_cost: coinCost,
    unlock_at: unlockAt,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `Chapter ${number} already exists for this novel.` };
    }
    return { error: error.message };
  }

  await admin
    .from("novels")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", novelId);

  revalidatePath("/admin");
  redirect(`/admin/novels/${novelId}/chapters`);
}

export async function setChapterPublished(
  chapterId: string,
  published: boolean,
): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("chapters")
    .select("id, novel_id")
    .eq("id", chapterId)
    .maybeSingle();
  if (!existing) return { error: "Chapter not found." };

  const { error } = await admin
    .from("chapters")
    .update({ is_published: published, updated_at: new Date().toISOString() })
    .eq("id", chapterId);

  if (error) return { error: error.message };

  await admin
    .from("novels")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", existing.novel_id);

  revalidatePath(`/admin/novels/${existing.novel_id}/chapters`);
  revalidatePath("/novels", "layout");
  revalidatePath("/");
  return {};
}

export async function publishAllChapters(novelId: string): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();

  const { error } = await admin
    .from("chapters")
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq("novel_id", novelId)
    .eq("is_published", false);

  if (error) return { error: error.message };

  await admin
    .from("novels")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", novelId);

  revalidatePath(`/admin/novels/${novelId}/chapters`);
  revalidatePath("/novels", "layout");
  revalidatePath("/");
  return {};
}

export async function deleteChapter(chapterId: string): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("chapters")
    .select("id, novel_id")
    .eq("id", chapterId)
    .maybeSingle();
  if (!existing) return { error: "Chapter not found." };

  const { error } = await admin.from("chapters").delete().eq("id", chapterId);
  if (error) return { error: error.message };

  await admin
    .from("novels")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", existing.novel_id);

  revalidatePath(`/admin/novels/${existing.novel_id}/chapters`);
  revalidatePath("/novels", "layout");
  return {};
}

export async function updateChapter(
  chapterId: string,
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title) return { error: "Chapter title is required." };
  if (!content) return { error: "Chapter content is required." };

  const access = String(formData.get("access") ?? "free");
  const isFree = access !== "paid";
  const coinCost = isFree ? 0 : Math.floor(Number(formData.get("coinCost") ?? 0));

  if (!isFree && (!Number.isFinite(coinCost) || coinCost < 1)) {
    return { error: "Paid chapters need a coin cost of at least 1." };
  }

  const numberRaw = Math.floor(Number(formData.get("number") ?? 0));
  const number = Number.isFinite(numberRaw) && numberRaw >= 1 ? numberRaw : undefined;

  const unlockAtRaw = String(formData.get("unlockAt") ?? "").trim();
  let unlockAt: string | null = null;
  if (unlockAtRaw) {
    const date = new Date(unlockAtRaw);
    if (Number.isNaN(date.getTime())) {
      return { error: "Auto-unlock date is invalid." };
    }
    unlockAt = date.toISOString();
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("chapters")
    .select("id, novel_id")
    .eq("id", chapterId)
    .maybeSingle();

  if (!existing) return { error: "Chapter not found." };

  const { error } = await admin
    .from("chapters")
    .update({
      title,
      content,
      is_free: isFree,
      coin_cost: coinCost,
      unlock_at: unlockAt,
      ...(number !== undefined ? { number } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", chapterId);

  if (error) {
    if (error.code === "23505") {
      return { error: `Chapter ${number} already exists for this novel.` };
    }
    return { error: error.message };
  }

  await admin
    .from("novels")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", existing.novel_id);

  revalidatePath("/admin");
  revalidatePath("/novels", "layout");
  redirect(`/admin/novels/${existing.novel_id}/chapters`);
}
