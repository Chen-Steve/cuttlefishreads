/**
 * Profile role: translators (main catalog) are application-gated.
 * Originals publishing is open to any signed-in user — no stored author role.
 * Master admin stays an env allowlist, not a stored role.
 *
 * Source of truth is profiles.role ('user' | 'translator').
 * The legacy profiles.roles array is ignored.
 */

export type ProfileRole = "translator";

export type StoredProfileRole = "user" | "translator";

/** Read translator access from profiles.role. */
export function parseProfileRoles(input: {
  role?: string | null;
  /** @deprecated Ignored — profiles.role is the source of truth. */
  roles?: string[] | null;
}): ProfileRole[] {
  if (input.role === "translator") return ["translator"];
  return [];
}

export function hasProfileRole(
  roles: readonly ProfileRole[],
  role: ProfileRole,
): boolean {
  return roles.includes(role);
}

export function isTranslatorRole(role: string | null | undefined): boolean {
  return role === "translator";
}

export function storedRoleFromFlags(
  isTranslator: boolean,
): StoredProfileRole {
  return isTranslator ? "translator" : "user";
}
