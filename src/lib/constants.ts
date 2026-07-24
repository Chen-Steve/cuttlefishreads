export const SITE = {
  name: "Cuttlefish Reads",
  shortName: "cuttlefishreads",
  description: "Discover popular and niche novels",
  seoDescription:
    "Read popular and niche web novels on Cuttlefish Reads, with updated chapters, novel summaries, genres, and reading progress.",
  discordUrl: "https://discord.gg/VQtwqRAVkP",
} as const;

/** Public brand for the Originals surface (originals.cuttlefishreads.com). */
export const ORIGINALS = {
  name: "Cuttlefish Originals",
  shortName: "Originals",
  description: "Original fiction from independent authors",
  seoDescription:
    "Read original web novels on Cuttlefish Originals — free chapters, author-supported stories, and new series.",
  writeCta: "Start writing",
} as const;

export const LANGUAGES = [
  "Chinese",
  "Japanese",
  "Korean",
] as const;

export type Language = (typeof LANGUAGES)[number] | "English";

export const PUBLICATION_TYPES = ["original", "translation"] as const;

export type PublicationType = (typeof PUBLICATION_TYPES)[number];

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  original: "Original",
  translation: "Translation",
};

export const COPYRIGHT_TYPES = [
  "all_rights_reserved",
  "public_domain",
  "creative_commons",
] as const;

export type CopyrightType = (typeof COPYRIGHT_TYPES)[number];

export const COPYRIGHT_TYPE_LABELS: Record<CopyrightType, string> = {
  all_rights_reserved: "All rights reserved",
  public_domain: "Public domain",
  creative_commons: "Creative commons",
};

/** Feature flag for public Originals surfaces. */
export function originalsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ORIGINALS_ENABLED === "0") return false;
  return true;
}

export const GENRES = [
  "Action",
  "Adult",
  "Adventure",
  "BL",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fanfiction",
  "Fantasy",
  "Gender Bender",
  "GL",
  "Harem",
  "Historical",
  "Horror",
  "Isekai",
  "Josei",
  "LitRPG",
  "Martial Arts",
  "Mature",
  "Mecha",
  "Mystery",
  "Psychological",
  "Romance",
  "School Life",
  "Sci-Fi",
  "Seinen",
  "Slice of Life",
  "Smut",
  "Sports",
  "Supernatural",
  "Thriller",
  "Tragedy",
  "Xianxia",
] as const;

export type Genre = (typeof GENRES)[number];

/** Max free-form tags on Originals novel create/edit. */
export const MAX_ORIGINAL_TAGS = 25;
