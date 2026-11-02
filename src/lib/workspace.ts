/**
 * Translator workspace at /workspace (application-gated).
 * Kept off /admin so Vercel system mitigations don't treat it as an exploit probe.
 */
export const WORKSPACE_BASE = "/workspace";

export const WORKSPACE_LABELS = { novels: "My Novels", noun: "novel" } as const;

/** Map old /admin URLs onto /workspace so login redirects don't hit the WAF. */
export function rewriteLegacyWorkspacePath(path: string): string {
  if (path === "/admin") return WORKSPACE_BASE;
  if (path.startsWith("/admin/")) {
    return `${WORKSPACE_BASE}${path.slice("/admin".length)}`;
  }
  return path;
}
