export const SITE = {
  name: "Cuttlefish Reads",
  description: "Discover popular and niche novels",
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
