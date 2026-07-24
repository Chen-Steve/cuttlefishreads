/**
 * Profile roles: translators (main catalog) are application-gated.
 * Originals publishing is open to any signed-in user — no stored author role.
 * Master admin stays an env allowlist, not a stored role.
 */

export const PROFILE_ROLES = ["translator"] as const;

export type ProfileRole = (typeof PROFILE_ROLES)[number];

export function parseProfileRoles(input: {
  roles?: string[] | null;
  role?: string | null;
}): ProfileRole[] {
  const fromArray = (input.roles ?? []).filter(
    (value): value is ProfileRole => value === "translator",
  );
  if (fromArray.length > 0) {
    return [...new Set(fromArray)];
  }
  // Legacy single-column fallback before roles was backfilled.
  if (input.role === "translator") return ["translator"];
  return [];
}

export function hasProfileRole(
  roles: readonly ProfileRole[],
  role: ProfileRole,
): boolean {
  return roles.includes(role);
}

/** Legacy profiles.role value kept in sync for older queries. */
export function legacyRoleFromRoles(
  roles: readonly ProfileRole[],
): "user" | "translator" {
  return roles.includes("translator") ? "translator" : "user";
}

/** Merge a granted role into an existing roles array (idempotent). */
export function withProfileRole(
  existing: readonly ProfileRole[],
  role: ProfileRole,
): ProfileRole[] {
  if (existing.includes(role)) return [...existing];
  return [...existing, role];
}
