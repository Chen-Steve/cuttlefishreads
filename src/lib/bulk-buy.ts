export const BULK_BUY_MIN_ADVANCED_CHAPTERS = 10;

export type BulkBuyChapter = {
  isAdvanced: boolean;
  locked: boolean;
  coinCost: number;
};

export type BulkBuyState = {
  eligible: boolean;
  purchasableCount: number;
  fullPrice: number;
};

export function getBulkBuyState(chapters: BulkBuyChapter[]): BulkBuyState {
  const advancedCount = chapters.filter((c) => c.isAdvanced).length;
  const purchasable = chapters.filter((c) => c.locked && c.coinCost > 0);
  const fullPrice = purchasable.reduce((sum, c) => sum + c.coinCost, 0);

  return {
    eligible: advancedCount >= BULK_BUY_MIN_ADVANCED_CHAPTERS,
    purchasableCount: purchasable.length,
    fullPrice,
  };
}
