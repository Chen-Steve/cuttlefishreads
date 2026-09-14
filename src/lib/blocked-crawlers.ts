/**
 * Archive and scraper user agents that ignore robots.txt and drove
 * the production edge-request surge (Wayback Machine + similar IA bots).
 */
const BLOCKED_USER_AGENT_PATTERNS = [
  /wayback_machine/i,
  /ia_archiver/i,
  /archive\.org_bot/i,
  /special_archiver/i,
] as const;

export const BLOCKED_CRAWLER_USER_AGENTS = [
  "ia_archiver",
  "archive.org_bot",
  "Wayback_Machine_Firefox",
  "special_archiver",
] as const;

export function isBlockedCrawlerUserAgent(
  userAgent: string | null | undefined,
): boolean {
  if (!userAgent) return false;
  return BLOCKED_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function isCrawlerBlockExemptPath(pathname: string): boolean {
  return pathname === "/robots.txt";
}
