/** Join truthy class names into a single string. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Display backend messages using cookie terminology in the UI. */
export function cookiesLabel(text: string): string {
  return text
    .replace(/\bCoins\b/g, "Cookies")
    .replace(/\bcoins\b/g, "cookies")
    .replace(/\bCoin\b/g, "Cookie")
    .replace(/\bcoin\b/g, "cookie");
}

/** Convert a title into a URL-friendly slug. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
