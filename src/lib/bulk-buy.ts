import type { Chapter } from "@/types";

export const BULK_BUY_MIN_ADVANCED_CHAPTERS = 10;
export const BULK_BUY_DISCOUNT_RATE = 0.1;

export type BulkBuyState = {
  eligible: boolean;
  advancedCount: number;
  purchasableCount: number;
  fullPrice: number;
  discountedPrice: number;
};

export function getBulkBuyState(chapters: Chapter[]): BulkBuyState {
  const advancedCount = chapters.filter((c) => c.isAdvanced).length;
  const purchasable = chapters.filter((c) => c.locked && c.coinCost > 0);
  const fullPrice = purchasable.reduce((sum, c) => sum + c.coinCost, 0);

  return {
    eligible: advancedCount >= BULK_BUY_MIN_ADVANCED_CHAPTERS,
    advancedCount,
    purchasableCount: purchasable.length,
    fullPrice,
    discountedPrice: Math.floor(fullPrice * (1 - BULK_BUY_DISCOUNT_RATE)),
  };
}
