import type { ForumReactionKey } from "./constants";

export type ForumSection = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export type ForumCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  adminOnlyThreads: boolean;
  /** Null when the category's section was removed. */
  sectionId: string | null;
};

export type ForumCategoryOverview = ForumCategory & {
  sectionSlug: string | null;
  sectionName: string | null;
  sectionOrder: number | null;
  threadCount: number;
  replyCount: number;
  lastPostAt: string | null;
  latestThreadId: string | null;
  latestThreadTitle: string | null;
};

/** A board-index heading and the categories filed under it. */
export type ForumCategoryGroup = {
  id: string;
  /** Section slug when grouped; null for the ungrouped trailing bucket. */
  slug: string | null;
  name: string;
  categories: ForumCategoryOverview[];
};

export type ForumAuthor = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type ForumThreadSummary = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  lastPostAt: string;
  createdAt: string;
  author: ForumAuthor;
};

export type ForumReactionSummary = {
  key: ForumReactionKey;
  count: number;
  reactedByCurrentUser: boolean;
};

export type ForumPost = {
  id: string;
  threadId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  isOwn: boolean;
  /** The oldest post in a thread — deleting it withdraws the whole thread. */
  isOpeningPost: boolean;
  reactions: ForumReactionSummary[];
};

export type ForumThreadPage = {
  thread: ForumThreadSummary;
  posts: ForumPost[];
  page: number;
  pageCount: number;
};

export type ForumNotification = {
  id: string;
  type: "reply" | "reaction";
  emoji: ForumReactionKey | null;
  threadId: string;
  threadTitle: string;
  postId: string;
  excerpt: string;
  actor: ForumAuthor;
  readAt: string | null;
  createdAt: string;
};

export type ForumProfileActivity = {
  threads: Array<{
    id: string;
    title: string;
    categoryName: string;
    replyCount: number;
    createdAt: string;
  }>;
  posts: Array<{
    id: string;
    threadId: string;
    threadTitle: string;
    excerpt: string;
    createdAt: string;
  }>;
};

/** Compact post row used by the board-index sidebar. */
export type ForumSidebarPost = {
  id: string;
  threadId: string;
  threadTitle: string;
  excerpt: string;
  createdAt: string;
  author: ForumAuthor;
};

/** Compact thread row used by the board-index sidebar. */
export type ForumSidebarThread = {
  id: string;
  title: string;
  createdAt: string;
  author: ForumAuthor;
};

export type ForumSidebarFeed = {
  latestPosts: ForumSidebarPost[];
  latestThreads: ForumSidebarThread[];
  /** Author-first view of recent posts (links out to member profiles). */
  latestProfilePosts: ForumSidebarPost[];
};
