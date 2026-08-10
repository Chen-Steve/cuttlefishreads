import { originalsPublicUrl } from "@/lib/hosts";

/**
 * The board's fixed reaction set. Members pick at most one per post, so these
 * read as a stance on the post rather than a tally of separate votes.
 */
export const FORUM_REACTIONS = [
  { key: "like", symbol: "👍", label: "Like" },
  { key: "love", symbol: "❤️", label: "Love" },
  { key: "laugh", symbol: "😄", label: "Laugh" },
  { key: "insightful", symbol: "💡", label: "Insightful" },
] as const;

export type ForumReactionKey = (typeof FORUM_REACTIONS)[number]["key"];

export const FORUM_REACTION_KEYS = FORUM_REACTIONS.map(
  (reaction) => reaction.key,
) as readonly ForumReactionKey[];

export function isForumReactionKey(value: string): value is ForumReactionKey {
  return (FORUM_REACTION_KEYS as readonly string[]).includes(value);
}

export function forumReactionSymbol(key: ForumReactionKey): string {
  return FORUM_REACTIONS.find((reaction) => reaction.key === key)?.symbol ?? "";
}

export const MAX_THREAD_TITLE_LENGTH = 160;
export const MAX_POST_LENGTH = 10_000;
export const MAX_SECTION_NAME_LENGTH = 60;
export const MAX_CATEGORY_NAME_LENGTH = 60;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 240;

export const THREADS_PER_PAGE = 25;
export const POSTS_PER_PAGE = 30;
export const NOTIFICATIONS_PER_PAGE = 50;
/** Recent threads and replies shown on a member's public profile. */
export const PROFILE_ACTIVITY_LIMIT = 5;
/** Items per widget in the forum index sidebar. */
export const SIDEBAR_FEED_LIMIT = 8;

// Forum pages live at /originals/forum internally and are served from
// /forum on the Originals host, so links always go through these helpers.
export function forumUrl(path = ""): string {
  return originalsPublicUrl(`/forum${path}`);
}

export function forumCategoryUrl(slug: string, page?: number): string {
  const suffix = page && page > 1 ? `?page=${page}` : "";
  return forumUrl(`/c/${slug}${suffix}`);
}

/**
 * Passing a postId adds ?post=, which lets the thread page work out which page
 * that post sits on before jumping to its anchor.
 */
export function forumThreadUrl(
  threadId: string,
  options: { page?: number; postId?: string } = {},
): string {
  const params = new URLSearchParams();
  if (options.page && options.page > 1) params.set("page", String(options.page));
  if (options.postId) params.set("post", options.postId);

  const query = params.size > 0 ? `?${params.toString()}` : "";
  const hash = options.postId ? `#post-${options.postId}` : "";
  return forumUrl(`/t/${threadId}${query}${hash}`);
}

export function forumInboxUrl(): string {
  return forumUrl("/inbox");
}

export function forumManageUrl(): string {
  return forumUrl("/manage");
}

/**
 * Member profile link. Authors are redirected on to their creator page by
 * /profiles/[username], so one link works for readers and authors alike.
 */
export function forumProfileUrl(username: string): string {
  return originalsPublicUrl(`/profiles/${encodeURIComponent(username)}`);
}

/** Sends guests to sign in and returns them to where they were reading. */
export function forumLoginUrl(returnPath: string): string {
  return originalsPublicUrl(
    `/login?redirect=${encodeURIComponent(returnPath)}`,
  );
}
