import type { Genre } from "@/lib/constants";

export interface Novel {
  id: string;
  slug: string;
  title: string;
  author: string;
  synopsis: string;
  coverUrl?: string;
  genres: Genre[];
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
}

export interface User {
  id: string;
  username: string;
  email: string;
  library: string[];
}

export type { Genre };
