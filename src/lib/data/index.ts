export { novelChaptersCacheTag } from "@/lib/chapter-cache-tags";

export {
  isNaturallyFree,
  NOVELS_CATALOG_CACHE_TAG,
  RECENTLY_UPDATED_NOVELS_CACHE_TAG,
  NOVEL_RATINGS_CACHE_TAG,
  novelCommentsCacheTag,
  profileCacheTag,
  userBookmarksCacheTag,
  revalidateNovelsDataCache,
} from "./shared";

export {
  getNovels,
  getNovel,
  getFeaturedNovels,
  getNewlyAddedNovels,
  getUnderratedNovels,
  getCompletedNovels,
  getRecentlyUpdatedNovels,
  getBookmarkedSlugs,
  isNovelBookmarked,
  getLibraryNovels,
  getPublicProfile,
  getUserBookmarkedNovels,
  getUserCreatedNovels,
  searchNovels,
  getNovelSearchIndex,
  getClosestNovelTitleMatch,
  isUserAuthenticated,
  getNovelRatingSummary,
  getNovelRatingSummariesBySlug,
} from "./catalog";
export type { PublicProfile } from "./catalog";

export {
  getPublicChapterMeta,
  getPublicChapterListPage,
  getChapterListItems,
  getChapterListLockUpdates,
  getPublicChapterSummaries,
  getPublicChapterNeighbors,
  getChapterAccess,
  getChapterSummaries,
  getChapter,
  getPublicFreeChapter,
  isChapterReadable,
} from "./chapters";
export type { PublicChapterMeta, PublicChapterListPage } from "./chapters";

export {
  getChapterComments,
  getNovelComments,
  getCommentReplies,
  getCommentTarget,
  getUserComments,
} from "./comments";
export type {
  NovelCommentsResult,
  AccountComment,
  AccountCommentReply,
  ReadableChapter,
} from "./comments";
