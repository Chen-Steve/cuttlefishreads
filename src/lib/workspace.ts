/**
 * Translator workspace at /workspace (application-gated).
 * Kept off /admin so Vercel system mitigations don't treat it as an exploit probe.
 */
export type WorkspaceKind = "translations";

export const WORKSPACE_BASE: Record<WorkspaceKind, string> = {
  translations: "/workspace",
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

/** Map old /admin URLs onto /workspace so login redirects don't hit the WAF. */
export function rewriteLegacyWorkspacePath(path: string): string {
  if (path === "/admin") return WORKSPACE_BASE.translations;
  if (path.startsWith("/admin/")) {
    return `${WORKSPACE_BASE.translations}${path.slice("/admin".length)}`;
  }
  return path;
}
