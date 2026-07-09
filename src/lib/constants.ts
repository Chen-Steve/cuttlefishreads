export const SITE = {
  name: "Cuttlefish Reads",
  shortName: "cuttlefishreads",
  description: "Discover popular and niche novels",
  seoDescription:
    "Read popular and niche web novels on Cuttlefish Reads, with updated chapters, novel summaries, genres, and reading progress.",
  discordUrl: "https://discord.gg/VQtwqRAVkP",
} as const;

export const LANGUAGES = [
  "Chinese",
  "Japanese",
  "Korean",
] as const;

export type Language = (typeof LANGUAGES)[number];

export const GENRES = [
  "Action",
  "Adult",
  "Adventure",
  "BL",
  "Comedy",
  "Drama",
  "Fantasy",
  "GL",
  "Harem",
  "Historical",
  "Horror",
  "Isekai",
  "Martial Arts",
  "Mecha",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Smut",
  "Supernatural",
  "Thriller",
  "Xianxia",
] as const;

export type Genre = (typeof GENRES)[number];
