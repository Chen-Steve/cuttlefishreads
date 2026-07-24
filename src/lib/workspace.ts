import type { PublicationType } from "@/lib/constants";

/**
 * Two separate publishing workspaces share one implementation:
 *   - Translator workspace at /admin (translations only; application-gated)
 *   - Author workspace at originals.cuttlefishreads.com/workspace
 *
 * Each workspace only ever lists and manages novels of its own publication
 * type. Master admins can use both.
 */
export type WorkspaceKind = "translations" | "originals";

export const WORKSPACE_BASE: Record<WorkspaceKind, string> = {
  translations: "/admin",
  originals: "/workspace",
};

export const WORKSPACE_PUBLICATION_TYPE: Record<WorkspaceKind, PublicationType> =
  {
    translations: "translation",
    originals: "original",
  };

export const WORKSPACE_LABELS: Record<
  WorkspaceKind,
  { novels: string; noun: string }
> = {
  translations: { novels: "My Novels", noun: "novel" },
  originals: { novels: "My Original Series", noun: "series" },
};

/** Which workspace a (client-side) pathname belongs to. */
export function workspaceKindFromPathname(pathname: string): WorkspaceKind {
  return pathname.startsWith(WORKSPACE_BASE.originals)
    ? "originals"
    : "translations";
}

/** Home base for a novel's workspace, from its publication type. */
export function workspaceBaseForPublicationType(
  publicationType: string | null | undefined,
): string {
  return publicationType === "original"
    ? WORKSPACE_BASE.originals
    : WORKSPACE_BASE.translations;
}

/** Convert a public workspace URL to its internal App Router namespace. */
export function workspaceInternalPath(path: string): string {
  if (path === "/workspace" || path.startsWith("/workspace/")) {
    return `/originals${path}`;
  }
  return path;
}
