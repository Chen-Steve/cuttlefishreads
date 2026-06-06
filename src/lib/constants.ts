export const SITE = {
  name: "Cuttlefish Reads",
  shortName: "cuttlefishreads",
  description: "Discover popular and niche novels",
  seoDescription:
    "Read popular and niche web novels on Cuttlefish Reads, with updated chapters, novel summaries, genres, and reading progress.",
} as const;

export const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Isekai",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
] as const;

export type Genre = (typeof GENRES)[number];
