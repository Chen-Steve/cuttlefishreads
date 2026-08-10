/** Same-origin relative paths only — blocks open redirects (`//evil.com`). */
export function safeReturnPath(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return undefined;
  return trimmed;
}

export function loginHref(returnPath: string) {
  return `/login?redirect=${encodeURIComponent(returnPath)}`;
}

export function shopHref(returnPath?: string) {
  if (!returnPath) return "/shop";
  return `/shop?return=${encodeURIComponent(returnPath)}`;
}
