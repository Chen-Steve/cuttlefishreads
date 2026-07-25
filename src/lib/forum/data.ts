import { cookies } from "next/headers";

import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";

import {
  isForumReactionKey,
  NOTIFICATIONS_PER_PAGE,
  POSTS_PER_PAGE,
  PROFILE_ACTIVITY_LIMIT,
  SIDEBAR_FEED_LIMIT,
  THREADS_PER_PAGE,
  type ForumReactionKey,
} from "./constants";
import type {
  ForumAuthor,
  ForumCategory,
  ForumCategoryGroup,
  ForumCategoryOverview,
  ForumNotification,
  ForumPost,
  ForumProfileActivity,
  ForumReactionSummary,
  ForumSection,
  ForumSidebarFeed,
  ForumSidebarPost,
  ForumSidebarThread,
  ForumThreadPage,
  ForumThreadSummary,
} from "./types";

const THREAD_COLUMNS =
  "id, category_id, title, is_pinned, is_locked, reply_count, last_post_at, created_at, author:profiles!forum_threads_author_id_fkey(id, username, avatar_url)";

const POST_COLUMNS =
  "id, thread_id, body, created_at, updated_at, author:profiles!forum_posts_author_id_fkey(id, username, avatar_url)";

type DbAuthor = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type DbThread = {
  id: string;
  category_id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_post_at: string;
  created_at: string;
  author: DbAuthor | null;
};

type DbPost = {
  id: string;
  thread_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: DbAuthor | null;
};

function mapAuthor(author: DbAuthor | null): ForumAuthor {
  return {
    id: author?.id ?? "",
    username: author?.username ?? "Unknown",
    avatarUrl: author?.avatar_url ?? null,
  };
}

function mapThread(
  row: DbThread,
  category: { slug: string; name: string },
): ForumThreadSummary {
  return {
    id: row.id,
    categoryId: row.category_id,
    categorySlug: category.slug,
    categoryName: category.name,
    title: row.title,
    isPinned: row.is_pinned,
    isLocked: row.is_locked,
    replyCount: row.reply_count,
    lastPostAt: row.last_post_at,
    createdAt: row.created_at,
    author: mapAuthor(row.author),
  };
}

export type ForumViewer = {
  userId: string;
  isMasterAdmin: boolean;
};

/** Signed-in member plus whether they moderate. Null when logged out. */
export async function getForumViewer(): Promise<ForumViewer | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  return {
    userId: data.claims.sub as string,
    isMasterAdmin: isAdminEmail(data.claims.email as string | undefined),
  };
}

export async function getForumSections(): Promise<ForumSection[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("forum_sections")
    .select("id, slug, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getForumSections:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    sortOrder: (row.sort_order as number) ?? 0,
  }));
}

export async function getForumCategories(): Promise<ForumCategoryOverview[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("forum_category_overview")
    .select(
      "id, slug, name, description, sort_order, admin_only_threads, section_id, section_slug, section_name, section_order, thread_count, reply_count, last_post_at, latest_thread_id, latest_thread_title",
    )
    .order("section_order", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getForumCategories:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    sortOrder: (row.sort_order as number) ?? 0,
    adminOnlyThreads: Boolean(row.admin_only_threads),
    sectionId: (row.section_id as string | null) ?? null,
    sectionSlug: (row.section_slug as string | null) ?? null,
    sectionName: (row.section_name as string | null) ?? null,
    sectionOrder: (row.section_order as number | null) ?? null,
    threadCount: Number(row.thread_count ?? 0),
    replyCount: Number(row.reply_count ?? 0),
    lastPostAt: (row.last_post_at as string | null) ?? null,
    latestThreadId: (row.latest_thread_id as string | null) ?? null,
    latestThreadTitle: (row.latest_thread_title as string | null) ?? null,
  }));
}

/**
 * Splits an already-sorted category list into board-index sections. Categories
 * whose section was deleted collect under one trailing heading instead of
 * disappearing from the board.
 */
export function groupForumCategories(
  categories: ForumCategoryOverview[],
): ForumCategoryGroup[] {
  const groups = new Map<string, ForumCategoryGroup>();

  for (const category of categories) {
    const id = category.sectionId ?? "ungrouped";
    const group = groups.get(id);

    if (group) {
      group.categories.push(category);
      continue;
    }

    groups.set(id, {
      id,
      slug: category.sectionSlug,
      name: category.sectionName ?? "Other",
      categories: [category],
    });
  }

  return [...groups.values()];
}

export async function getForumCategory(
  slug: string,
): Promise<ForumCategory | null> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("forum_categories")
    .select(
      "id, slug, name, description, sort_order, admin_only_threads, section_id",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getForumCategory:", error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description ?? "",
    sortOrder: data.sort_order ?? 0,
    adminOnlyThreads: Boolean(data.admin_only_threads),
    sectionId: data.section_id ?? null,
  };
}

export type CategoryThreadsResult = {
  threads: ForumThreadSummary[];
  page: number;
  pageCount: number;
};

export async function getCategoryThreads(
  category: ForumCategory,
  page = 1,
): Promise<CategoryThreadsResult> {
  const supabase = createClient(await cookies());
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * THREADS_PER_PAGE;

  const { data, error, count } = await supabase
    .from("forum_threads")
    .select(THREAD_COLUMNS, { count: "exact" })
    .eq("category_id", category.id)
    .order("is_pinned", { ascending: false })
    .order("last_post_at", { ascending: false })
    .range(from, from + THREADS_PER_PAGE - 1);

  if (error) {
    console.error("getCategoryThreads:", error);
    return { threads: [], page: currentPage, pageCount: 1 };
  }

  const rows = (data ?? []) as unknown as DbThread[];
  return {
    threads: rows.map((row) => mapThread(row, category)),
    page: currentPage,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / THREADS_PER_PAGE)),
  };
}

async function fetchReactionSummaries(
  postIds: string[],
  currentUserId: string | null,
): Promise<Map<string, ForumReactionSummary[]>> {
  const summaries = new Map<string, ForumReactionSummary[]>();
  if (postIds.length === 0) return summaries;

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("forum_reactions")
    .select("post_id, user_id, emoji")
    .in("post_id", postIds);

  if (error) {
    console.error("fetchReactionSummaries:", error);
    return summaries;
  }

  for (const row of data ?? []) {
    const emoji = row.emoji as string;
    if (!isForumReactionKey(emoji)) continue;

    const existing = summaries.get(row.post_id as string) ?? [];
    const entry = existing.find((summary) => summary.key === emoji);
    if (entry) {
      entry.count += 1;
      entry.reactedByCurrentUser ||= row.user_id === currentUserId;
    } else {
      existing.push({
        key: emoji,
        count: 1,
        reactedByCurrentUser: row.user_id === currentUserId,
      });
    }
    summaries.set(row.post_id as string, existing);
  }

  return summaries;
}

export async function getForumThread(
  threadId: string,
  page = 1,
  currentUserId: string | null = null,
): Promise<ForumThreadPage | null> {
  const supabase = createClient(await cookies());

  const { data: threadRow, error: threadError } = await supabase
    .from("forum_threads")
    .select(
      `${THREAD_COLUMNS}, category:forum_categories!forum_threads_category_id_fkey(slug, name)`,
    )
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) {
    console.error("getForumThread:", threadError);
    return null;
  }
  if (!threadRow) return null;

  const row = threadRow as unknown as DbThread & {
    category: { slug: string; name: string } | null;
  };
  const thread = mapThread(row, {
    slug: row.category?.slug ?? "",
    name: row.category?.name ?? "Forum",
  });

  const totalPosts = thread.replyCount + 1;
  const pageCount = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const from = (currentPage - 1) * POSTS_PER_PAGE;

  const { data: postRows, error: postsError } = await supabase
    .from("forum_posts")
    .select(POST_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .range(from, from + POSTS_PER_PAGE - 1);

  if (postsError) {
    console.error("getForumThread posts:", postsError);
    return { thread, posts: [], page: currentPage, pageCount };
  }

  const rows = (postRows ?? []) as unknown as DbPost[];
  const reactions = await fetchReactionSummaries(
    rows.map((post) => post.id),
    currentUserId,
  );

  const posts: ForumPost[] = rows.map((post, index) => ({
    id: post.id,
    threadId: post.thread_id,
    body: post.body,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    author: mapAuthor(post.author),
    isOwn: currentUserId != null && post.author?.id === currentUserId,
    isOpeningPost: currentPage === 1 && index === 0,
    reactions: (reactions.get(post.id) ?? []).sort(
      (a, b) => b.count - a.count || a.key.localeCompare(b.key),
    ),
  }));

  return { thread, posts, page: currentPage, pageCount };
}

/** Page number holding a given post, so inbox links land on the right page. */
export async function getPostPage(
  threadId: string,
  postId: string,
): Promise<number> {
  const supabase = createClient(await cookies());

  const { data: post } = await supabase
    .from("forum_posts")
    .select("created_at")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return 1;

  const { count } = await supabase
    .from("forum_posts")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId)
    .lt("created_at", post.created_at);

  return Math.floor((count ?? 0) / POSTS_PER_PAGE) + 1;
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const supabase = createClient(await cookies());
  const { count, error } = await supabase
    .from("forum_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("getUnreadNotificationCount:", error);
    return 0;
  }

  return count ?? 0;
}

export async function getForumNotifications(
  userId: string,
): Promise<ForumNotification[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("forum_notifications")
    .select(
      "id, type, emoji, thread_id, post_id, read_at, created_at, actor:profiles!forum_notifications_actor_id_fkey(id, username, avatar_url), thread:forum_threads!forum_notifications_thread_id_fkey(title), post:forum_posts!forum_notifications_post_id_fkey(body)",
    )
    .eq("user_id", userId)
    .order("read_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_PER_PAGE);

  if (error) {
    console.error("getForumNotifications:", error);
    return [];
  }

  type DbNotification = {
    id: string;
    type: "reply" | "reaction";
    emoji: string | null;
    thread_id: string;
    post_id: string;
    read_at: string | null;
    created_at: string;
    actor: DbAuthor | null;
    thread: { title: string } | null;
    post: { body: string } | null;
  };

  return ((data ?? []) as unknown as DbNotification[]).map((row) => ({
    id: row.id,
    type: row.type,
    emoji:
      row.emoji && isForumReactionKey(row.emoji)
        ? (row.emoji as ForumReactionKey)
        : null,
    threadId: row.thread_id,
    threadTitle: row.thread?.title ?? "A thread",
    postId: row.post_id,
    excerpt: row.post?.body ?? "",
    actor: mapAuthor(row.actor),
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

function excerptBody(body: string, limit = 100) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

/** Recent posts and threads for the board-index right rail. */
export async function getForumSidebarFeed(): Promise<ForumSidebarFeed> {
  const supabase = createClient(await cookies());
  // Pull a few extras so soft-deleted threads filtered client-side still leave
  // a full sidebar page.
  const fetchLimit = SIDEBAR_FEED_LIMIT + 8;

  const [postsResult, threadsResult] = await Promise.all([
    supabase
      .from("forum_posts")
      .select(
        "id, thread_id, body, created_at, author:profiles!forum_posts_author_id_fkey(id, username, avatar_url), thread:forum_threads!forum_posts_thread_id_fkey(id, title, deleted_at)",
      )
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("forum_threads")
      .select(
        "id, title, created_at, author:profiles!forum_threads_author_id_fkey(id, username, avatar_url)",
      )
      .order("created_at", { ascending: false })
      .limit(SIDEBAR_FEED_LIMIT),
  ]);

  if (postsResult.error) {
    console.error("getForumSidebarFeed posts:", postsResult.error);
  }
  if (threadsResult.error) {
    console.error("getForumSidebarFeed threads:", threadsResult.error);
  }

  type DbSidebarPost = {
    id: string;
    thread_id: string;
    body: string;
    created_at: string;
    author: DbAuthor | null;
    thread: { id: string; title: string; deleted_at: string | null } | null;
  };

  type DbSidebarThread = {
    id: string;
    title: string;
    created_at: string;
    author: DbAuthor | null;
  };

  const latestPosts: ForumSidebarPost[] = (
    (postsResult.data ?? []) as unknown as DbSidebarPost[]
  )
    .filter((row) => row.thread && row.thread.deleted_at == null)
    .slice(0, SIDEBAR_FEED_LIMIT)
    .map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      threadTitle: row.thread?.title ?? "A thread",
      excerpt: excerptBody(row.body),
      createdAt: row.created_at,
      author: mapAuthor(row.author),
    }));

  const latestThreads: ForumSidebarThread[] = (
    (threadsResult.data ?? []) as unknown as DbSidebarThread[]
  ).map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    author: mapAuthor(row.author),
  }));

  return {
    latestPosts,
    latestThreads,
    latestProfilePosts: latestPosts,
  };
}

/** Recent board activity shown on a member's public Originals profile. */
export async function getForumProfileActivity(
  userId: string,
): Promise<ForumProfileActivity> {
  const supabase = createClient(await cookies());

  const [threadsResult, postsResult] = await Promise.all([
    supabase
      .from("forum_threads")
      .select(
        "id, title, reply_count, created_at, category:forum_categories!forum_threads_category_id_fkey(name)",
      )
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(PROFILE_ACTIVITY_LIMIT),
    supabase
      .from("forum_posts")
      .select(
        "id, thread_id, body, created_at, thread:forum_threads!forum_posts_thread_id_fkey(title)",
      )
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(PROFILE_ACTIVITY_LIMIT),
  ]);

  if (threadsResult.error) {
    console.error("getForumProfileActivity threads:", threadsResult.error);
  }
  if (postsResult.error) {
    console.error("getForumProfileActivity posts:", postsResult.error);
  }

  type DbProfileThread = {
    id: string;
    title: string;
    reply_count: number;
    created_at: string;
    category: { name: string } | null;
  };

  type DbProfilePost = {
    id: string;
    thread_id: string;
    body: string;
    created_at: string;
    thread: { title: string } | null;
  };

  const threads = (
    (threadsResult.data ?? []) as unknown as DbProfileThread[]
  ).map((row) => ({
    id: row.id,
    title: row.title,
    categoryName: row.category?.name ?? "Forum",
    replyCount: row.reply_count,
    createdAt: row.created_at,
  }));

  const posts = ((postsResult.data ?? []) as unknown as DbProfilePost[]).map(
    (row) => ({
      id: row.id,
      threadId: row.thread_id,
      threadTitle: row.thread?.title ?? "A thread",
      excerpt: row.body,
      createdAt: row.created_at,
    }),
  );

  return { threads, posts };
}
