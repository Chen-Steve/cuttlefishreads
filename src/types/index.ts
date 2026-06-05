import type { Genre } from "@/lib/constants";

export interface Novel {
  id: string;
  slug: string;
  title: string;
  author: string;
  originalAuthor?: string;
  translator?: string;
  synopsis: string;
  coverUrl?: string;
  genres: Genre[];
  tags: string[];
  status: "ongoing" | "completed" | "hiatus";
  chapterCount: number;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  novelSlug: string;
  number: number;
  title: string;
  content: string[];
  publishedAt: string;
  isFree: boolean;
  coinCost: number;
  unlockAt: string | null;
  /** Whether the current user may read this chapter. */
  locked: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  library: string[];
}

export type { Genre };
