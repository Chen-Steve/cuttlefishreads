export const SITE = {
  name: "Cuttlefish",
  shortName: "cuttlefishreads",
  description: "Discover popular and niche novels",
  seoDescription:
    "Read popular and niche web novels on Cuttlefish, with updated chapters, novel summaries, genres, and reading progress.",
  discordUrl: "https://discord.gg/VQtwqRAVkP",
  legalEmail: "legal@cuttlefishreads.com",
  contactEmail: "contact@cuttlefishreads.com",
  supportEmail: "support@cuttlefishreads.com",
} as const;

export const LANGUAGES = [
  "Chinese",
  "Japanese",
  "Korean",
] as const;

export type Language = (typeof LANGUAGES)[number] | "English";

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
