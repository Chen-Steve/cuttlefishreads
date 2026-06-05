// Coin pricing — the single source of truth for what coins cost.
// Used by the shop UI (display) AND the server (to compute the authoritative
// price when creating/verifying a PayPal order). The client never dictates a
// price; it only sends a package id or a custom coin amount.

export const MIN_COINS = 20;
// Base rate: 20 coins = $5.00 → 25 cents per coin.
export const CENTS_PER_COIN = 25;
export const CURRENCY = "USD";

export type CoinPackage = {
  id: string;
  label: string;
  description: string;
  price: number; // cents
  coins: number; // base coins
  bonusCoins: number;
  highlight: boolean;
};

// Larger packs include bonus coins so the per-coin cost drops, nudging users
// toward higher-value purchases.
export const COIN_PACKAGES: readonly CoinPackage[] = [
  {
    id: "pack_starter",
    label: "Starter",
    description: "Try it out",
    price: 5_00,
    coins: 20,
    bonusCoins: 0,
    highlight: false,
  },
  {
    id: "pack_reader",
    label: "Reader",
    description: "11 % more coins",
    price: 10_00,
    coins: 40,
    bonusCoins: 5,
    highlight: false,
  },
  {
    id: "pack_regular",
    label: "Regular",
    description: "17 % more coins",
    price: 15_00,
    coins: 60,
    bonusCoins: 10,
    highlight: false,
  },
  {
    id: "pack_enthusiast",
    label: "Enthusiast",
    description: "17 % more coins",
    price: 25_00,
    coins: 100,
    bonusCoins: 20,
    highlight: true,
  },
  {
    id: "pack_collector",
    label: "Collector",
    description: "Best value — 23 % more coins",
    price: 50_00,
    coins: 200,
    bonusCoins: 60,
    highlight: false,
  },
] as const;

export const CUSTOM_PACKAGE_ID = "pack_custom";

export function getPackageById(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id);
}

export function centsToAmountString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export type OrderInput =
  | { packageId: string }
  | { customCoins: number };

export type ComputedOrder = {
  packageId: string;
  coins: number; // total coins to credit (incl. bonus)
  amountCents: number;
};

/**
 * Resolves a client request into the authoritative coins + price.
 * Returns null if the request is invalid (unknown package, or a custom amount
 * below the minimum / not an integer).
 */
export function computeOrder(input: OrderInput): ComputedOrder | null {
  if ("packageId" in input && input.packageId !== CUSTOM_PACKAGE_ID) {
    const pkg = getPackageById(input.packageId);
    if (!pkg) return null;
    return {
      packageId: pkg.id,
      coins: pkg.coins + pkg.bonusCoins,
      amountCents: pkg.price,
    };
  }

  if ("customCoins" in input) {
    const n = Math.floor(input.customCoins);
    if (!Number.isFinite(n) || n < MIN_COINS) return null;
    return {
      packageId: CUSTOM_PACKAGE_ID,
      coins: n,
      amountCents: n * CENTS_PER_COIN,
    };
  }

  return null;
}
