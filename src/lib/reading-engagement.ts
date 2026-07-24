/** In-house reading engagement thresholds (must match DB RPC checks). */
export const READER_MIN_ACTIVE_SECONDS = 30;
/** Scroll depth that qualifies a logged-in user as a reader for the novel. */
export const READER_MIN_SCROLL_PCT = 50;
/** Scroll depth that marks a chapter as completed. */
export const CHAPTER_COMPLETE_SCROLL_PCT = 90;

export type NovelEngagementStats = {
  views: number;
  readers: number;
  libraryAdds: number;
};
