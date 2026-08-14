import { GENRES, type Genre } from "@/lib/constants";
import type { Novel } from "@/types";

export type NovelStatusFilter = Novel["status"] | "all";

export type NovelSortOption =
  | "updated"
  | "newest"
  | "title-asc"
  | "title-desc"
  | "views-desc"
  | "views-asc";

export type NovelsBrowseFilters = {
  query: string;
  status: NovelStatusFilter;
  genre: Genre | null;
  sort: NovelSortOption;
};

export const DEFAULT_NOVELS_BROWSE_FILTERS: NovelsBrowseFilters = {
  query: "",
  status: "all",
  genre: null,
  sort: "updated",
};

const SORT_VALUES = new Set<string>([
  "updated",
  "newest",
  "title-asc",
  "title-desc",
  "views-desc",
  "views-asc",
]);

const STATUS_VALUES = new Set<string>(["ongoing", "completed", "hiatus"]);
const GENRE_VALUES = new Set<string>(GENRES);

type SearchParamValue = string | string[] | undefined;

export type NovelsBrowseSearchParams = {
  q?: SearchParamValue;
  sort?: SearchParamValue;
  status?: SearchParamValue;
  genre?: SearchParamValue;
};

function firstParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseNovelsBrowseParams(
  params: NovelsBrowseSearchParams,
): NovelsBrowseFilters {
  const query = firstParam(params.q)?.trim() ?? "";
  const sortValue = firstParam(params.sort);
  const statusValue = firstParam(params.status);
  const genreValue = firstParam(params.genre);

  return {
    query,
    sort:
      sortValue && SORT_VALUES.has(sortValue)
        ? (sortValue as NovelSortOption)
        : "updated",
    status:
      statusValue && STATUS_VALUES.has(statusValue)
        ? (statusValue as Novel["status"])
        : "all",
    genre:
      genreValue && GENRE_VALUES.has(genreValue)
        ? (genreValue as Genre)
        : null,
  };
}

export function novelsBrowseHref(
  filters: Partial<NovelsBrowseFilters> = {},
): string {
  const params = new URLSearchParams();
  const query = filters.query?.trim() ?? "";
  if (query) params.set("q", query);
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.sort && filters.sort !== "updated") {
    params.set("sort", filters.sort);
  }
  const qs = params.toString();
  return qs ? `/novels?${qs}` : "/novels";
}
