"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  isForumReactionKey,
  MAX_CATEGORY_DESCRIPTION_LENGTH,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_POST_LENGTH,
  MAX_SECTION_NAME_LENGTH,
  MAX_THREAD_TITLE_LENGTH,
  type ForumReactionKey,
} from "@/lib/forum/constants";
import { getForumViewer } from "@/lib/forum/data";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type ForumActionState = { error?: string };

// Forum routes are served from /forum but live under /originals/forum in the
// App Router, and revalidatePath matches route files rather than public URLs.
function revalidateBoard() {
  revalidatePath("/originals/forum");
  revalidatePath("/originals/forum/c/[categorySlug]", "page");
  revalidatePath("/originals/forum/t/[threadId]", "page");
}

/** Board plus the admin screen the change was made on. */
function revalidateManagedBoard() {
  revalidateBoard();
  revalidatePath("/originals/forum/manage");
}

function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Give your thread a title.";
  if (trimmed.length > MAX_THREAD_TITLE_LENGTH) {
    return `Title must be ${MAX_THREAD_TITLE_LENGTH} characters or fewer.`;
  }
  return null;
}

function validateBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Write something first.";
  if (trimmed.length > MAX_POST_LENGTH) {
    return `Posts must be ${MAX_POST_LENGTH.toLocaleString()} characters or fewer.`;
  }
  return null;
}

/**
 * Inbox rows are written with the service role: a member may not insert
 * notifications for anyone else. Duplicates (code 23505) are expected when
 * someone re-applies a reaction they already sent, and are ignored.
 */
async function notify(
  rows: Array<{
    user_id: string;
    actor_id: string;
    type: "reply" | "reaction";
    thread_id: string;
    post_id: string;
    emoji?: ForumReactionKey | null;
  }>,
) {
  if (rows.length === 0) return;

  const admin = createAdminClient();
  for (const row of rows) {
    const { error } = await admin.from("forum_notifications").insert({
      ...row,
      emoji: row.emoji ?? null,
    });
    if (error && error.code !== "23505") {
      console.error("forum notify:", error);
    }
  }
}

export type CreateThreadState = ForumActionState & { threadId?: string };

export async function createThread(
  categorySlug: string,
  title: string,
  body: string,
): Promise<CreateThreadState> {
  const viewer = await getForumViewer();
  if (!viewer) return { error: "Please sign in to start a thread." };

  const titleError = validateTitle(title);
  if (titleError) return { error: titleError };
  const bodyError = validateBody(body);
  if (bodyError) return { error: bodyError };

  const supabase = createClient(await cookies());
  const { data: category } = await supabase
    .from("forum_categories")
    .select("id, slug, admin_only_threads")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) return { error: "Category not found." };
  if (category.admin_only_threads && !viewer.isMasterAdmin) {
    return { error: "Only moderators can post in this category." };
  }

  // Announcement threads bypass RLS because master admin is an env allowlist
  // rather than a database role; the check above is the gate.
  const client = category.admin_only_threads ? createAdminClient() : supabase;

  const { data: thread, error: threadError } = await client
    .from("forum_threads")
    .insert({
      category_id: category.id,
      author_id: viewer.userId,
      title: title.trim(),
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    return { error: threadError?.message ?? "Could not start the thread." };
  }

  const { error: postError } = await client.from("forum_posts").insert({
    thread_id: thread.id,
    author_id: viewer.userId,
    body: body.trim(),
  });

  if (postError) {
    // Without an opening post the thread would render empty — undo it.
    await client.from("forum_threads").delete().eq("id", thread.id);
    return { error: postError.message };
  }

  revalidateBoard();
  return { threadId: thread.id };
}

export async function createReply(
  threadId: string,
  body: string,
): Promise<ForumActionState> {
  const viewer = await getForumViewer();
  if (!viewer) return { error: "Please sign in to reply." };

  const bodyError = validateBody(body);
  if (bodyError) return { error: bodyError };

  const supabase = createClient(await cookies());
  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, author_id, is_locked")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) return { error: "Thread not found." };
  if (thread.is_locked) return { error: "This thread is locked." };

  const { data: post, error } = await supabase
    .from("forum_posts")
    .insert({
      thread_id: threadId,
      author_id: viewer.userId,
      body: body.trim(),
    })
    .select("id")
    .single();

  if (error || !post) {
    return { error: error?.message ?? "Could not post your reply." };
  }

  // Everyone already taking part in the thread hears about a new reply.
  const { data: participants } = await supabase
    .from("forum_posts")
    .select("author_id")
    .eq("thread_id", threadId);

  const recipients = new Set<string>([
    thread.author_id,
    ...(participants ?? []).map((row) => row.author_id as string),
  ]);
  recipients.delete(viewer.userId);

  await notify(
    [...recipients].map((userId) => ({
      user_id: userId,
      actor_id: viewer.userId,
      type: "reply" as const,
      thread_id: threadId,
      post_id: post.id,
    })),
  );

  revalidateBoard();
  return {};
}

export async function updatePost(
  postId: string,
  body: string,
): Promise<ForumActionState> {
  const viewer = await getForumViewer();
  if (!viewer) return { error: "Please sign in to edit your post." };

  const bodyError = validateBody(body);
  if (bodyError) return { error: bodyError };

  const supabase = createClient(await cookies());
  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, thread_id")
    .eq("id", postId)
    .eq("author_id", viewer.userId)
    .maybeSingle();

  if (!post) return { error: "Post not found." };

  const { error } = await supabase
    .from("forum_posts")
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", viewer.userId);

  if (error) return { error: error.message };

  revalidateBoard();
  return {};
}

export async function deletePost(postId: string): Promise<ForumActionState> {
  const viewer = await getForumViewer();
  if (!viewer) return { error: "Please sign in to delete your post." };

  const supabase = createClient(await cookies());
  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, thread_id, created_at")
    .eq("id", postId)
    .eq("author_id", viewer.userId)
    .maybeSingle();

  if (!post) return { error: "Post not found." };

  // Soft-delete must use the service role: setting deleted_at makes the row
  // fail the public SELECT policy, and PostgREST RETURNING then errors with
  // "new row violates row-level security policy".
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("forum_posts")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", postId)
    .eq("author_id", viewer.userId);

  if (error) return { error: error.message };

  // Nothing survives before the opening post, so if no earlier post remains
  // this was it — withdraw the thread rather than leave it headless.
  const { count: earlierPosts } = await admin
    .from("forum_posts")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", post.thread_id)
    .is("deleted_at", null)
    .lt("created_at", post.created_at);

  if ((earlierPosts ?? 0) === 0) {
    await admin
      .from("forum_threads")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", post.thread_id)
      .eq("author_id", viewer.userId);
  }

  revalidateBoard();
  return {};
}

export async function setReaction(
  postId: string,
  emoji: string,
): Promise<ForumActionState> {
  const viewer = await getForumViewer();
  if (!viewer) return { error: "Please sign in to react." };
  if (!isForumReactionKey(emoji)) return { error: "Unknown reaction." };

  const supabase = createClient(await cookies());
  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, thread_id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return { error: "Post not found." };

  const { data: existing } = await supabase
    .from("forum_reactions")
    .select("id, emoji")
    .eq("post_id", postId)
    .eq("user_id", viewer.userId)
    .maybeSingle();

  // Choosing the reaction you already picked clears it.
  if (existing?.emoji === emoji) {
    const { error } = await supabase
      .from("forum_reactions")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", viewer.userId);
    if (error) return { error: error.message };

    revalidateBoard();
    return {};
  }

  const { error } = await supabase
    .from("forum_reactions")
    .upsert(
      { post_id: postId, user_id: viewer.userId, emoji },
      { onConflict: "post_id,user_id" },
    );

  if (error) return { error: error.message };

  if (post.author_id !== viewer.userId) {
    await notify([
      {
        user_id: post.author_id,
        actor_id: viewer.userId,
        type: "reaction",
        thread_id: post.thread_id,
        post_id: postId,
        emoji,
      },
    ]);
  }

  revalidateBoard();
  return {};
}

export async function markNotificationRead(
  notificationId: string,
): Promise<ForumActionState> {
  const viewer = await getForumViewer();
  if (!viewer) return { error: "Please sign in." };

  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("forum_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", viewer.userId)
    .is("read_at", null);

  if (error) return { error: error.message };

  revalidatePath("/originals/forum/inbox");
  return {};
}

export async function markAllNotificationsRead(): Promise<ForumActionState> {
  const viewer = await getForumViewer();
  if (!viewer) return { error: "Please sign in." };

  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("forum_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", viewer.userId)
    .is("read_at", null);

  if (error) return { error: error.message };

  revalidatePath("/originals/forum/inbox");
  return {};
}

// -----------------------------------------------------------------------------
// Moderation — master admins only (ADMIN_EMAILS allowlist).
// -----------------------------------------------------------------------------

async function requireModerator(): Promise<
  { admin: ReturnType<typeof createAdminClient> } | { error: string }
> {
  const viewer = await getForumViewer();
  if (!viewer?.isMasterAdmin) return { error: "Not allowed." };
  return { admin: createAdminClient() };
}

export async function moderateThread(
  threadId: string,
  changes: { isPinned?: boolean; isLocked?: boolean; removed?: boolean },
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (changes.isPinned !== undefined) update.is_pinned = changes.isPinned;
  if (changes.removed !== undefined) {
    update.deleted_at = changes.removed ? new Date().toISOString() : null;
    // Locking a removed thread also freezes it for its author, who would
    // otherwise still hold update rights on their own row.
    if (changes.removed) update.is_locked = true;
  }
  if (changes.isLocked !== undefined) update.is_locked = changes.isLocked;

  const { error } = await gate.admin
    .from("forum_threads")
    .update(update)
    .eq("id", threadId);

  if (error) return { error: error.message };

  revalidateBoard();
  return {};
}

export async function moderatePost(
  postId: string,
  removed: boolean,
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const now = new Date().toISOString();
  const { error } = await gate.admin
    .from("forum_posts")
    .update({ deleted_at: removed ? now : null, updated_at: now })
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidateBoard();
  return {};
}

export type SectionInput = {
  name: string;
  sortOrder: number;
};

function validateSection(input: SectionInput): string | null {
  const name = input.name.trim();
  if (!name) return "Give the section a name.";
  if (name.length > MAX_SECTION_NAME_LENGTH) {
    return `Name must be ${MAX_SECTION_NAME_LENGTH} characters or fewer.`;
  }
  if (!Number.isInteger(input.sortOrder))
    return "Order must be a whole number.";
  return null;
}

export async function createSection(
  input: SectionInput,
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const invalid = validateSection(input);
  if (invalid) return { error: invalid };

  const slug = slugify(input.name);
  if (!slug) return { error: "Name must contain letters or numbers." };

  const { error } = await gate.admin
    .from("forum_sections")
    .insert({ slug, name: input.name.trim(), sort_order: input.sortOrder });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "A section with that name already exists."
          : error.message,
    };
  }

  revalidateManagedBoard();
  return {};
}

export async function updateSection(
  sectionId: string,
  input: SectionInput,
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const invalid = validateSection(input);
  if (invalid) return { error: invalid };

  const { error } = await gate.admin
    .from("forum_sections")
    .update({
      name: input.name.trim(),
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sectionId);

  if (error) return { error: error.message };

  revalidateManagedBoard();
  return {};
}

/** Categories in a deleted section stay on the board, ungrouped. */
export async function deleteSection(
  sectionId: string,
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const { error } = await gate.admin
    .from("forum_sections")
    .delete()
    .eq("id", sectionId);

  if (error) return { error: error.message };

  revalidateManagedBoard();
  return {};
}

export type CategoryInput = {
  name: string;
  description: string;
  sortOrder: number;
  adminOnlyThreads: boolean;
  sectionId: string | null;
};

function validateCategory(input: CategoryInput): string | null {
  const name = input.name.trim();
  if (!name) return "Give the category a name.";
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return `Name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`;
  }
  if (input.description.trim().length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters or fewer.`;
  }
  if (!Number.isInteger(input.sortOrder))
    return "Order must be a whole number.";
  return null;
}

export async function createCategory(
  input: CategoryInput,
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const invalid = validateCategory(input);
  if (invalid) return { error: invalid };

  const slug = slugify(input.name);
  if (!slug) return { error: "Name must contain letters or numbers." };

  const { error } = await gate.admin.from("forum_categories").insert({
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    sort_order: input.sortOrder,
    admin_only_threads: input.adminOnlyThreads,
    section_id: input.sectionId,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "A category with that name already exists."
          : error.message,
    };
  }

  revalidateManagedBoard();
  return {};
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput,
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const invalid = validateCategory(input);
  if (invalid) return { error: invalid };

  const { error } = await gate.admin
    .from("forum_categories")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      sort_order: input.sortOrder,
      admin_only_threads: input.adminOnlyThreads,
      section_id: input.sectionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) return { error: error.message };

  revalidateManagedBoard();
  return {};
}

export async function deleteCategory(
  categoryId: string,
): Promise<ForumActionState> {
  const gate = await requireModerator();
  if ("error" in gate) return gate;

  const { count } = await gate.admin
    .from("forum_threads")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    return {
      error: "Move or remove this category's threads before deleting it.",
    };
  }

  const { error } = await gate.admin
    .from("forum_categories")
    .delete()
    .eq("id", categoryId);

  if (error) return { error: error.message };

  revalidateManagedBoard();
  return {};
}
