import type { Genre } from "@/lib/constants";

export interface Novel {
  id: string;
  slug: string;
  title: string;
  author: string;
  originalAuthor?: string;
  translator?: string;
  translatorUsername?: string;
  translatorGlobalNote?: string;
  translatorKofiUrl?: string;
  translatorPatreonUrl?: string;
  synopsis: string;
  coverUrl?: string;
  genres: Genre[];
  tags: string[];
  status: "ongoing" | "completed" | "hiatus";
  chapterCount: number;
  updatedAt: string;
  publisherId?: string;
}

export interface Chapter {
  id: string;
  novelSlug: string;
  number: number;
  title: string;
  content: string[];
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

export interface User {
  id: string;
  username: string;
  email: string;
  library: string[];
}

export interface NovelComment {
  id: string;
  novelSlug: string;
  chapterNumber: number | null;
  parentId: string | null;
  body: string;
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

export type { Genre };
