/**
 * Translator workspace at /admin (application-gated).
 */
export type WorkspaceKind = "translations";

export const WORKSPACE_BASE: Record<WorkspaceKind, string> = {
  translations: "/admin",
};

export const WORKSPACE_LABELS: Record<
  WorkspaceKind,
  { novels: string; noun: string }
> = {
  translations: { novels: "My Novels", noun: "novel" },
};

/** Which workspace a (client-side) pathname belongs to. */
export function workspaceKindFromPathname(_pathname: string): WorkspaceKind {
  return "translations";
}

/** Public workspace path (identity; kept for call-site clarity). */
export function workspaceInternalPath(path: string): string {
  return path;
}
