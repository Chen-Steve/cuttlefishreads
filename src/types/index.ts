import type { Genre, Language } from "@/lib/constants";

export interface Novel {
  id: string;
  slug: string;
  title: string;
  author: string;
  originalAuthor?: string;
  translator?: string;
  language: Language;
  translatorUsername?: string;
  translatorGlobalNote?: string;
  translatorKofiUrl?: string;
  translatorPatreonUrl?: string;
  novelupdatesUrl?: string;
  synopsis: string;
  coverUrl?: string;
  genres: Genre[];
  tags: string[];
  status: "ongoing" | "completed" | "hiatus";
  chapterCount: number;
  /** Page view total when available. */
  viewCount?: number;
  /** Bookmark / library-add total — usable for translation popularity. */
  libraryAddCount?: number;
  createdAt: string;
  updatedAt: string;
  publisherId?: string;
}

/** Catalog fields safe to send to client grids (no synopsis or translator notes). */
export type NovelCardData = Pick<
  Novel,
  | "id"
  | "slug"
  | "title"
  | "author"
  | "coverUrl"
  | "genres"
  | "tags"
  | "status"
  | "chapterCount"
  | "createdAt"
  | "updatedAt"
> &
  Partial<
    Pick<Novel, "originalAuthor" | "translator" | "translatorUsername">
  >;

export interface RecentlyUpdatedChapter {
  number: number;
  title: string;
  isAdvanced: boolean;
}

export interface RecentlyUpdatedNovel {
  slug: string;
  title: string;
  coverUrl?: string;
  recentChapters: RecentlyUpdatedChapter[];
  updatedAt: string;
  updatedAtLabel: string;
}

export interface Chapter {
  id: string;
  novelSlug: string;
  number: number;
  title: string;
  /** Omitted when the chapter is locked for the current reader. */
  content?: string[];
  /** Per-chapter message when useGlobalTranslatorNote is false. */
  translatorNote: string | null;
  /** When true, readers see the translator's global note from their profile. */
  useGlobalTranslatorNote: boolean;
  publishedAt: string;
  isFree: boolean;
  /** True when the chapter is published as paid (is_free = false in the database). */
  isAdvanced: boolean;
  coinCost: number;
  unlockAt: string | null;
  /** Whether the current user may read this chapter. */
  locked: boolean;
  /** True when the chapter is accessible only because of admin/publisher bypass. */
  adminAccess: boolean;
}

export interface ChapterSummary {
  number: number;
  title: string;
  locked: boolean;
}

/** Chapter metadata for lists/TOC — no body content. */
export type ChapterListItem = Omit<Chapter, "content">;

export interface NovelComment {
  id: string;
  novelSlug: string;
  chapterNumber: number | null;
  parentId: string | null;
  body: string;
  /** Optional 0–5 star rating on a top-level comment. */
  rating: number | null;
  userId: string;
  username: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  isOwn: boolean;
  /** True when this is a reply authored by the novel's translator/publisher. */
  isTranslatorReply: boolean;
  replies: NovelComment[];
  createdAt: string;
  updatedAt: string;
}

export interface NovelRatingSummary {
  /** Mean rating from comments that include a rating; 0 when none. */
  average: number;
  count: number;
}

export type CommunityPostKind = "novel_request" | "idea";
export type CommunityPostStatus = "open" | "planned" | "done" | "declined";

export interface CommunityPost {
  id: string;
  kind: CommunityPostKind;
  title: string;
  body: string;
  status: CommunityPostStatus;
  voteCount: number;
  votedByCurrentUser: boolean;
  userId: string;
  username: string;
  isOwn: boolean;
  createdAt: string;
}

export type { Genre, Language };
