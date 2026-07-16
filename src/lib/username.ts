import { randomBytes } from "crypto";

/** Username rules shared with account settings validation. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/** Trim + lowercase so uniqueness is case-insensitive. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

const ADJECTIVES = [
  "happy",
  "great",
  "brave",
  "clever",
  "swift",
  "quiet",
  "bold",
  "calm",
  "bright",
  "cosmic",
  "gentle",
  "golden",
  "lucky",
  "mighty",
  "noble",
  "quick",
  "silent",
  "sunny",
  "wild",
  "wise",
  "cozy",
  "curious",
  "fancy",
  "frosty",
  "jolly",
  "kind",
  "lively",
  "mellow",
  "nimble",
  "playful",
  "proud",
  "radiant",
  "rusty",
  "shiny",
  "sleepy",
  "snug",
  "spry",
  "steady",
  "velvet",
  "zesty",
] as const;

const ANIMALS = [
  "eagle",
  "panda",
  "fox",
  "wolf",
  "otter",
  "tiger",
  "bear",
  "hawk",
  "lynx",
  "crane",
  "dolphin",
  "falcon",
  "heron",
  "koala",
  "lemur",
  "moose",
  "orca",
  "owl",
  "raven",
  "seal",
  "sparrow",
  "swan",
  "turtle",
  "whale",
  "badger",
  "bison",
  "cobra",
  "finch",
  "gecko",
  "ibis",
  "jaguar",
  "kite",
  "llama",
  "macaw",
  "newt",
  "quail",
  "robin",
  "stoat",
  "viper",
  "wren",
] as const;

function pick<T extends readonly string[]>(list: T): T[number] {
  return list[randomBytes(1)[0]! % list.length]!;
}

/**
 * Random signup username like `happyeagle` / `greatpanda`.
 * Pass `withDigits` on collision retries for extra uniqueness.
 */
export function generateRandomUsername(withDigits = false): string {
  const base = `${pick(ADJECTIVES)}${pick(ANIMALS)}`;
  if (!withDigits) return base;
  const n = randomBytes(1)[0]! % 100;
  return `${base}${n.toString().padStart(2, "0")}`;
}
