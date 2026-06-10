"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess, type AdminAccess } from "@/lib/access";
import { slugify } from "@/lib/utils";
import { GENRES, type Genre, LANGUAGES, type Language } from "@/lib/constants";

export type AdminState = { error?: string };

export type SupportLinksState = { error?: string; message?: string };

// Validates an optional support link. Empty is allowed (clears the link);
// otherwise it must be an http(s) URL. Pass `allowedHostname` to restrict
// the link to a specific domain (e.g. "www.novelupdates.com").
function parseSupportLink(
  raw: string,
  label: string,
  allowedHostname?: string,
): string | null | { error: string } {
  const value = raw.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: `Enter a valid ${label} URL (including https://).` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: `Your ${label} link must start with http:// or https://.` };
  }
  if (allowedHostname) {
    // Accept both the bare domain and the www. subdomain.
    const bare = allowedHostname.replace(/^www\./, "");
    const hostname = url.hostname.toLowerCase();
    if (hostname !== bare && hostname !== `www.${bare}`) {
      return { error: `Your ${label} link must point to ${allowedHostname}.` };
    }
  }
  return url.toString();
}

export async function updateSupportLinks(
  _prev: SupportLinksState,
  formData: FormData,
): Promise<SupportLinksState> {
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const kofi = parseSupportLink(String(formData.get("kofiUrl") ?? ""), "Ko-fi");
  if (kofi && typeof kofi === "object") return { error: kofi.error };

  const patreon = parseSupportLink(
    String(formData.get("patreonUrl") ?? ""),
    "Patreon",
  );
  if (patreon && typeof patreon === "object") return { error: patreon.error };

  const globalNote = String(formData.get("globalNote") ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      translator_note: globalNote || null,
      kofi_url: kofi as string | null,
      patreon_url: patreon as string | null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.access.userId);

  if (error) return { error: error.message };

  // Global note and support links appear on chapters that use the global message.
  revalidatePath("/novels", "layout");
  revalidatePath("/admin/settings");
  return { message: "Settings saved." };
}

const NOVEL_STATUSES = ["ongoing", "completed", "hiatus"] as const;
type NovelStatus = (typeof NOVEL_STATUSES)[number];

type WorkspaceAuth = { access?: AdminAccess; error?: string };

// Allows master admins and approved translators into the shared workspace.
async function requireWorkspace(): Promise<WorkspaceAuth> {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) {
    return { error: "You are not authorized to perform this action." };
  }
  return { access };
}

// Translators may only act on novels they own (publisher_id === their id).
// Master admins can act on any novel.
function ownsNovel(access: AdminAccess, publisherId: string | null): boolean {
  return access.isMasterAdmin || publisherId === access.userId;
}

type ChapterWithNovel = {
  id: string;
  novel_id: string;
  novels: { publisher_id: string | null } | null;
};

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
  try {
    return await _createNovel(formData);
  } catch (err) {
    // redirect() throws internally — re-throw so Next.js can handle navigation.
    if (
      err != null &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("[createNovel] unexpected error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
    };
  }
}

async function _createNovel(formData: FormData): Promise<AdminState> {
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };
  const { access } = auth;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "ongoing");
  const status: NovelStatus = NOVEL_STATUSES.includes(statusRaw as NovelStatus)
    ? (statusRaw as NovelStatus)
    : "ongoing";
  const languageRaw = String(formData.get("language") ?? "Chinese");
  const language: Language = (LANGUAGES as readonly string[]).includes(languageRaw)
    ? (languageRaw as Language)
    : "Chinese";
  const genres = parseGenres(formData);
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const cover = formData.get("cover");
  const novelupdatesUrl = parseSupportLink(
    String(formData.get("novelupdatesUrl") ?? ""),
    "NovelUpdates",
    "novelupdates.com",
  );
  if (novelupdatesUrl && typeof novelupdatesUrl === "object") return { error: novelupdatesUrl.error };

  const admin = createAdminClient();

  // Translators get fixed attribution: the novel is theirs, the translator name
  // is their own username, and there is no separate original-author field. Only
  // master admins can set attribution and a publisher manually.
  let originalAuthor: string;
  let translator: string;
  let publisherId: string | null = null;

  if (access.isMasterAdmin) {
    originalAuthor = String(formData.get("originalAuthor") ?? "").trim();
    translator = String(formData.get("translator") ?? "").trim() || (access.username ?? "");
    const publisherUsername = String(formData.get("publisherUsername") ?? "").trim();
    if (publisherUsername) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("username", publisherUsername)
        .maybeSingle();
      if (!profile) return { error: `No user found with username "${publisherUsername}".` };
      publisherId = profile.id;
    }
  } else {
    originalAuthor = "";
    translator = access.username ?? "";
    publisherId = access.userId;
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
    language,
    publisher_id: publisherId,
    novelupdates_url: (novelupdatesUrl as string | null) ?? null,
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
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };
  const { access } = auth;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "ongoing");
  const status: NovelStatus = NOVEL_STATUSES.includes(statusRaw as NovelStatus)
    ? (statusRaw as NovelStatus)
    : "ongoing";
  const languageRaw = String(formData.get("language") ?? "Chinese");
  const language: Language = (LANGUAGES as readonly string[]).includes(languageRaw)
    ? (languageRaw as Language)
    : "Chinese";
  const genres = parseGenres(formData);
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const cover = formData.get("cover");
  const novelupdatesUrl = parseSupportLink(
    String(formData.get("novelupdatesUrl") ?? ""),
    "NovelUpdates",
    "novelupdates.com",
  );
  if (novelupdatesUrl && typeof novelupdatesUrl === "object") return { error: novelupdatesUrl.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("novels")
    .select("id, slug, cover_url, original_author, translator, publisher_id")
    .eq("id", novelId)
    .maybeSingle();

  if (!existing) return { error: "That novel no longer exists." };
  if (!ownsNovel(access, existing.publisher_id)) {
    return { error: "You can only manage your own novels." };
  }

  // Translators cannot change attribution or the owning publisher — those stay
  // pinned to their account. Master admins can edit everything.
  let originalAuthor: string;
  let translator: string;
  let publisherId: string | null;

  if (access.isMasterAdmin) {
    originalAuthor = String(formData.get("originalAuthor") ?? "").trim();
    translator =
      String(formData.get("translator") ?? "").trim() ||
      existing.translator ||
      (access.username ?? "");
    const publisherUsername = String(formData.get("publisherUsername") ?? "").trim();
    publisherId = null;
    if (publisherUsername) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("username", publisherUsername)
        .maybeSingle();
      if (!profile) return { error: `No user found with username "${publisherUsername}".` };
      publisherId = profile.id;
    }
  } else {
    originalAuthor = "";
    translator = access.username ?? existing.translator ?? "";
    publisherId = existing.publisher_id;
  }

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
      language,
      publisher_id: publisherId,
      novelupdates_url: (novelupdatesUrl as string | null) ?? null,
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
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("novels")
    .select("slug, publisher_id")
    .eq("id", novelId)
    .maybeSingle();

  if (!existing) return { error: "That novel no longer exists." };
  if (!ownsNovel(auth.access, existing.publisher_id)) {
    return { error: "You can only manage your own novels." };
  }

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
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const novelId = String(formData.get("novelId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const noteMode = String(formData.get("noteMode") ?? "global");
  const useGlobalNote = noteMode !== "unique";
  const translatorNote = useGlobalNote
    ? null
    : String(formData.get("translatorNote") ?? "").trim() || null;

  if (!novelId) return { error: "Choose a novel." };
  if (!content) return { error: "Chapter content is required." };

  const access = String(formData.get("access") ?? "free");
  const isFree = access !== "paid";
  const coinCost = isFree ? 0 : Math.floor(Number(formData.get("coinCost") ?? 0));

  if (!isFree && (!Number.isFinite(coinCost) || coinCost < 1)) {
    return { error: "Paid chapters need a cookie cost of at least 1." };
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
    .select("id, title, publisher_id")
    .eq("id", novelId)
    .maybeSingle();
  if (!novel) return { error: "That novel no longer exists." };
  if (!ownsNovel(auth.access, novel.publisher_id)) {
    return { error: "You can only manage your own novels." };
  }

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
    translator_note: translatorNote,
    use_global_translator_note: useGlobalNote,
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
  revalidatePath("/novels", "layout");
  redirect(`/admin/novels/${novelId}/chapters`);
}

export async function setChapterPublished(
  chapterId: string,
  published: boolean,
): Promise<AdminState> {
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("chapters")
    .select("id, novel_id, novels(publisher_id)")
    .eq("id", chapterId)
    .maybeSingle<ChapterWithNovel>();
  if (!existing) return { error: "Chapter not found." };
  if (!ownsNovel(auth.access, existing.novels?.publisher_id ?? null)) {
    return { error: "You can only manage your own novels." };
  }

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
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const admin = createAdminClient();

  const { data: novel } = await admin
    .from("novels")
    .select("publisher_id")
    .eq("id", novelId)
    .maybeSingle();
  if (!novel) return { error: "That novel no longer exists." };
  if (!ownsNovel(auth.access, novel.publisher_id)) {
    return { error: "You can only manage your own novels." };
  }

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
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("chapters")
    .select("id, novel_id, novels(publisher_id)")
    .eq("id", chapterId)
    .maybeSingle<ChapterWithNovel>();
  if (!existing) return { error: "Chapter not found." };
  if (!ownsNovel(auth.access, existing.novels?.publisher_id ?? null)) {
    return { error: "You can only manage your own novels." };
  }

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
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const noteMode = String(formData.get("noteMode") ?? "global");
  const useGlobalNote = noteMode !== "unique";
  const uniqueNote = String(formData.get("translatorNote") ?? "").trim() || null;

  if (!content) return { error: "Chapter content is required." };

  const access = String(formData.get("access") ?? "free");
  const isFree = access !== "paid";
  const coinCost = isFree ? 0 : Math.floor(Number(formData.get("coinCost") ?? 0));

  if (!isFree && (!Number.isFinite(coinCost) || coinCost < 1)) {
    return { error: "Paid chapters need a cookie cost of at least 1." };
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
    .select("id, novel_id, novels(publisher_id)")
    .eq("id", chapterId)
    .maybeSingle<ChapterWithNovel>();

  if (!existing) return { error: "Chapter not found." };
  if (!ownsNovel(auth.access, existing.novels?.publisher_id ?? null)) {
    return { error: "You can only manage your own novels." };
  }

  const { error } = await admin
    .from("chapters")
    .update({
      title,
      content,
      ...(useGlobalNote ? {} : { translator_note: uniqueNote }),
      use_global_translator_note: useGlobalNote,
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
