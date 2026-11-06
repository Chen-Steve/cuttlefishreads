import { Suspense, type ReactNode } from "react";

import WorkspaceLoading from "../loading";

/** Session and chapter reads have to stream. The shared layout boundary does not cover a navigation into a page. */
export function WorkspaceSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<WorkspaceLoading />}>{children}</Suspense>;
}
