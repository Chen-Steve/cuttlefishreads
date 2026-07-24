"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess, type AdminAccess } from "@/lib/access";
import { slugify } from "@/lib/utils";
import {
  workspaceBaseForPublicationType,
  workspaceInternalPath,
} from "@/lib/workspace";
import {
  COPYRIGHT_TYPES,
  type CopyrightType,
  GENRES,
  type Genre,
  LANGUAGES,
  type Language,
  MAX_ORIGINAL_TAGS,
  PUBLICATION_TYPES,
  type PublicationType,
} from "@/lib/constants";

// Public pages that show a novel of the given type.
function revalidatePublicPaths(publicationType: string | null | undefined) {
  if (publicationType === "original") {
    revalidatePath("/originals", "layout");
    revalidatePath("/series", "layout");
  } else {
    revalidatePath("/");
    revalidatePath("/novels", "layout");
  }
}

export type AdminState = { error?: string; success?: string };

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
  revalidatePath("/series", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/originals/workspace/settings");
  return { message: "Settings saved." };
}

const NOVEL_STATUSES = ["ongoing", "completed", "hiatus"] as const;
type NovelStatus = (typeof NOVEL_STATUSES)[number];

type WorkspaceAuth = { access?: AdminAccess; error?: string };

// Allows any signed-in user (Originals is open; translations are checked
// separately via assertCanPublish).
async function requireWorkspace(): Promise<WorkspaceAuth> {
  const access = await getAdminAccess();
  if (!access) {
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
  novels: { publisher_id: string | null; publication_type?: string | null } | null;
};

function parsePublicationType(formData: FormData): PublicationType {
  const raw = String(formData.get("publicationType") ?? "translation");
  return (PUBLICATION_TYPES as readonly string[]).includes(raw)
    ? (raw as PublicationType)
    : "translation";
}

function assertCanPublish(
  access: AdminAccess,
  publicationType: PublicationType,
): string | null {
  if (access.isMasterAdmin) return null;
  // Originals: any signed-in user. Translations still need translator access.
  if (publicationType === "original") return null;
  if (publicationType === "translation" && !access.isTranslator) {
    return "You need translator access to publish translations.";
  }
  return null;
}

function parseGenres(
  formData: FormData,
  publicationType: PublicationType,
): Genre[] | { error: string } {
  const allowed = new Set<string>(GENRES);
  const selected = formData
    .getAll("genres")
    .map(String)
    .filter((g) => allowed.has(g)) as Genre[];

  if (publicationType === "original") {
    const mainRaw = String(formData.get("mainGenre") ?? "").trim();
    if (!allowed.has(mainRaw)) {
      return {
        error: "Please select a main genre that best describes your story.",
      };
    }
    const main = mainRaw as Genre;
    return [main, ...selected.filter((g) => g !== main)];
  }

  return selected;
}

function parseTags(
  raw: string,
  options?: { max?: number },
): string[] | { error: string } {
  const tags = Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
  if (options?.max != null && tags.length > options.max) {
    return { error: `You can add at most ${options.max} tags.` };
  }
  return tags;
}

function parseCopyrightType(
  formData: FormData,
  publicationType: PublicationType,
): CopyrightType | null | { error: string } {
  if (publicationType !== "original") return null;
  const raw = String(formData.get("copyrightType") ?? "").trim();
  if (!(COPYRIGHT_TYPES as readonly string[]).includes(raw)) {
    return { error: "Please select a copyright type." };
  }
  return raw as CopyrightType;
}

const MAX_COVER_BYTES = 5 * 1024 * 1024;

function resolveCoverFile(
  coverFile: File | null | undefined,
  formData: FormData,
): File | null {
  if (coverFile instanceof File && coverFile.size > 0) return coverFile;
  const fromForm = formData.get("cover");
  if (fromForm instanceof File && fromForm.size > 0) return fromForm;
  return null;
}

function validateCoverFile(file: File): string | null {
  if (file.size > MAX_COVER_BYTES) {
    return `Cover image is too large (max ${MAX_COVER_BYTES / 1024 / 1024} MB). Try a smaller image.`;
  }
  if (file.type && !file.type.startsWith("image/")) {
    return "Cover must be an image file (JPEG, PNG, WebP, or GIF).";
  }
  return null;
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
  coverFile: File | null,
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  try {
    return await _createNovel(coverFile, formData);
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

async function _createNovel(
  coverFile: File | null,
  formData: FormData,
): Promise<AdminState> {
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "ongoing");
  const status: NovelStatus = NOVEL_STATUSES.includes(statusRaw as NovelStatus)
    ? (statusRaw as NovelStatus)
    : "ongoing";
  const languageRaw = String(formData.get("language") ?? "Chinese");
  let language: Language = (LANGUAGES as readonly string[]).includes(languageRaw)
    ? (languageRaw as Language)
    : "Chinese";
  const publicationType = parsePublicationType(formData);
  const genresResult = parseGenres(formData, publicationType);
  if ("error" in genresResult) return genresResult;
  const genres = genresResult;
  const tagsResult = parseTags(String(formData.get("tags") ?? ""), {
    max: publicationType === "original" ? MAX_ORIGINAL_TAGS : undefined,
  });
  if ("error" in tagsResult) return tagsResult;
  const tags = tagsResult;
  const copyrightResult = parseCopyrightType(formData, publicationType);
  if (copyrightResult && typeof copyrightResult === "object" && "error" in copyrightResult) {
    return copyrightResult;
  }
  const copyrightType = copyrightResult;
  const { access } = auth;
  const publishError = assertCanPublish(access, publicationType);
  if (publishError) return { error: publishError };
  // Originals are always English — ignore any submitted language value.
  if (publicationType === "original") {
    language = "English";
  }
  const cover = resolveCoverFile(coverFile, formData);
  if (cover) {
    const coverError = validateCoverFile(cover);
    if (coverError) return { error: coverError };
  }
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
      cover,
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
    publication_type: publicationType,
    copyright_type: copyrightType,
    ownership_confirmed_at:
      publicationType === "original" ? new Date().toISOString() : null,
  });

  if (error) {
    return { error: error.message };
  }

  const workspaceBase = workspaceBaseForPublicationType(publicationType);
  revalidatePath(workspaceInternalPath(workspaceBase));
  revalidatePublicPaths(publicationType);
  redirect(workspaceBase);
}

export async function updateNovel(
  novelId: string,
  coverFile: File | null,
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
  let language: Language = (LANGUAGES as readonly string[]).includes(languageRaw)
    ? (languageRaw as Language)
    : "Chinese";
  const cover = resolveCoverFile(coverFile, formData);
  if (cover) {
    const coverError = validateCoverFile(cover);
    if (coverError) return { error: coverError };
  }
  const novelupdatesUrl = parseSupportLink(
    String(formData.get("novelupdatesUrl") ?? ""),
    "NovelUpdates",
    "novelupdates.com",
  );
  if (novelupdatesUrl && typeof novelupdatesUrl === "object") return { error: novelupdatesUrl.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("novels")
    .select(
      "id, slug, cover_url, original_author, translator, publisher_id, publication_type, ownership_confirmed_at",
    )
    .eq("id", novelId)
    .maybeSingle();

  if (!existing) return { error: "That novel no longer exists." };
  if (!ownsNovel(access, existing.publisher_id)) {
    return { error: "You can only manage your own novels." };
  }

  // The publication type is fixed at creation by the workspace it was created
  // in — never trust the form to switch a work between the two catalogs.
  const publicationType = (existing.publication_type ??
    "translation") as PublicationType;
  const genresResult = parseGenres(formData, publicationType);
  if ("error" in genresResult) return genresResult;
  const genres = genresResult;
  const tagsResult = parseTags(String(formData.get("tags") ?? ""), {
    max: publicationType === "original" ? MAX_ORIGINAL_TAGS : undefined,
  });
  if ("error" in tagsResult) return tagsResult;
  const tags = tagsResult;
  const copyrightResult = parseCopyrightType(formData, publicationType);
  if (copyrightResult && typeof copyrightResult === "object" && "error" in copyrightResult) {
    return copyrightResult;
  }
  const copyrightType = copyrightResult;
  const publishError = assertCanPublish(access, publicationType);
  if (publishError) return { error: publishError };
  // Originals are always English — ignore any submitted language value.
  if (publicationType === "original") {
    language = "English";
  }
  let ownershipConfirmedAt: string | null =
    existing.ownership_confirmed_at ?? null;
  if (publicationType === "original") {
    ownershipConfirmedAt =
      ownershipConfirmedAt ?? new Date().toISOString();
  } else {
    ownershipConfirmedAt = null;
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
  if (cover) {
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
      publication_type: publicationType,
      copyright_type: copyrightType,
      ownership_confirmed_at: ownershipConfirmedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", novelId);

  if (error) {
    return { error: error.message };
  }

  const workspaceBase = workspaceBaseForPublicationType(publicationType);
  revalidatePath(workspaceInternalPath(workspaceBase));
  revalidatePublicPaths(publicationType);
  revalidatePath(`/novels/${existing.slug}`);
  redirect(workspaceBase);
}

export async function deleteNovel(novelId: string): Promise<AdminState> {
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("novels")
    .select("slug, publisher_id, publication_type")
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

  const workspaceBase = workspaceBaseForPublicationType(
    existing.publication_type,
  );
  revalidatePath(workspaceInternalPath(workspaceBase));
  revalidatePublicPaths(existing.publication_type);
  revalidatePath(`/novels/${existing.slug}`);
  redirect(workspaceBase);
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
  let isFree = access !== "paid";
  let coinCost = isFree ? 0 : Math.floor(Number(formData.get("coinCost") ?? 0));

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
    .select("id, title, publisher_id, publication_type")
    .eq("id", novelId)
    .maybeSingle();
  if (!novel) return { error: "That novel no longer exists." };
  if (!ownsNovel(auth.access, novel.publisher_id)) {
    return { error: "You can only manage your own novels." };
  }

  // Original works are always free on-site — never trust the form for this.
  if (novel.publication_type === "original") {
    isFree = true;
    coinCost = 0;
    unlockAt = null;
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

  const workspaceBase = workspaceBaseForPublicationType(
    novel.publication_type,
  );
  revalidatePath(workspaceInternalPath(workspaceBase));
  revalidatePublicPaths(novel.publication_type);
  redirect(`${workspaceBase}/novels/${novelId}/chapters`);
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
    .select("id, novel_id, novels(publisher_id, publication_type)")
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

  const workspaceBase = workspaceBaseForPublicationType(
    existing.novels?.publication_type,
  );
  revalidatePath(
    workspaceInternalPath(
      `${workspaceBase}/novels/${existing.novel_id}/chapters`,
    ),
  );
  revalidatePublicPaths(existing.novels?.publication_type);
  return {};
}

export async function publishAllChapters(novelId: string): Promise<AdminState> {
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const admin = createAdminClient();

  const { data: novel } = await admin
    .from("novels")
    .select("publisher_id, publication_type")
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

  const workspaceBase = workspaceBaseForPublicationType(
    novel.publication_type,
  );
  revalidatePath(
    workspaceInternalPath(`${workspaceBase}/novels/${novelId}/chapters`),
  );
  revalidatePublicPaths(novel.publication_type);
  return {};
}

export async function deleteChapter(chapterId: string): Promise<AdminState> {
  const auth = await requireWorkspace();
  if (!auth.access) return { error: auth.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("chapters")
    .select("id, novel_id, novels(publisher_id, publication_type)")
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

  const workspaceBase = workspaceBaseForPublicationType(
    existing.novels?.publication_type,
  );
  revalidatePath(
    workspaceInternalPath(
      `${workspaceBase}/novels/${existing.novel_id}/chapters`,
    ),
  );
  revalidatePublicPaths(existing.novels?.publication_type);
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
  let isFree = access !== "paid";
  let coinCost = isFree ? 0 : Math.floor(Number(formData.get("coinCost") ?? 0));

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
    .select("id, novel_id, novels(publisher_id, publication_type)")
    .eq("id", chapterId)
    .maybeSingle<ChapterWithNovel>();

  if (!existing) return { error: "Chapter not found." };
  if (!ownsNovel(auth.access, existing.novels?.publisher_id ?? null)) {
    return { error: "You can only manage your own novels." };
  }

  // Original works are always free on-site — never trust the form for this.
  if (existing.novels?.publication_type === "original") {
    isFree = true;
    coinCost = 0;
    unlockAt = null;
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

  const workspaceBase = workspaceBaseForPublicationType(
    existing.novels?.publication_type,
  );
  revalidatePath(workspaceInternalPath(workspaceBase));
  revalidatePath(
    workspaceInternalPath(
      `${workspaceBase}/novels/${existing.novel_id}/chapters`,
    ),
  );
  revalidatePath(
    workspaceInternalPath(
      `${workspaceBase}/novels/${existing.novel_id}/chapters/${chapterId}/edit`,
    ),
  );
  revalidatePublicPaths(existing.novels?.publication_type);
  return { success: "Chapter saved." };
}
