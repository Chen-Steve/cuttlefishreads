const SESSION_COOKIE_NAME = /^(sb-.+-auth-token)(?:\.(\d+))?$/;
const BASE64_PREFIX = "base64-";
/** Refresh only when the access token is about to expire. */
const REFRESH_WITHIN_SECONDS = 60;

/**
 * True when middleware should call Auth. A fresh access token skips that
 * round trip; a missing, unreadable, or nearly-expired session does not.
 */
export function authSessionNeedsRefresh(
  cookies: { name: string; value: string }[],
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const sessions = readSessionPayloads(cookies);
  if (sessions.length === 0) return true;

  for (const session of sessions) {
    const expiresAt = sessionExpiresAt(session);
    if (expiresAt == null) return true;
    if (expiresAt - nowSeconds <= REFRESH_WITHIN_SECONDS) return true;
  }
  return false;
}

function readSessionPayloads(
  cookies: { name: string; value: string }[],
): string[] {
  const groups = new Map<string, Map<number | "whole", string>>();

  for (const cookie of cookies) {
    const match = cookie.name.match(SESSION_COOKIE_NAME);
    if (!match) continue;
    const base = match[1]!;
    const index = match[2] == null ? "whole" : Number(match[2]);
    let chunks = groups.get(base);
    if (!chunks) {
      chunks = new Map();
      groups.set(base, chunks);
    }
    chunks.set(index, cookie.value);
  }

  const payloads: string[] = [];
  for (const chunks of groups.values()) {
    const combined = chunks.get("whole") ?? joinSessionChunks(chunks);
    if (!combined) return [];
    const decoded = decodeSessionCookie(combined);
    if (!decoded) return [];
    payloads.push(decoded);
  }
  return payloads;
}

function joinSessionChunks(
  chunks: Map<number | "whole", string>,
): string | null {
  const indexes = [...chunks.keys()]
    .filter((key): key is number => key !== "whole")
    .sort((a, b) => a - b);
  if (indexes.length === 0) return null;
  for (let i = 0; i < indexes.length; i++) {
    if (indexes[i] !== i) return null;
  }
  return indexes.map((index) => chunks.get(index)!).join("");
}

function decodeSessionCookie(value: string): string | null {
  if (!value.startsWith(BASE64_PREFIX)) return value;
  try {
    return decodeBase64Url(value.slice(BASE64_PREFIX.length));
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function sessionExpiresAt(payload: string): number | null {
  let parsed: { expires_at?: unknown; access_token?: unknown };
  try {
    parsed = JSON.parse(payload) as {
      expires_at?: unknown;
      access_token?: unknown;
    };
  } catch {
    return null;
  }

  const fromField = unixSeconds(parsed.expires_at);
  const fromJwt =
    typeof parsed.access_token === "string" ? jwtExp(parsed.access_token) : null;
  if (fromField == null) return fromJwt;
  if (fromJwt == null) return fromField;
  return Math.min(fromField, fromJwt);
}

function jwtExp(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return unixSeconds(parsed.exp);
  } catch {
    return null;
  }
}

function unixSeconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value > 1e12 ? Math.floor(value / 1000) : value;
}
