import type { Metadata } from "next";

import { WorkspaceSuspense } from "../_components/workspace-suspense";
import { WorkspaceCommentsPage } from "../_pages/comments-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CommentsPage() {
  return (
    <WorkspaceSuspense>
      <WorkspaceCommentsPage />
    </WorkspaceSuspense>
  );
}
