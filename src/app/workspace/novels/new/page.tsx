import type { Metadata } from "next";

import { WorkspaceSuspense } from "../../_components/workspace-suspense";
import { WorkspaceNovelNewPage } from "../../_pages/novel-new-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CreateNovelPage() {
  return (
    <WorkspaceSuspense>
      <WorkspaceNovelNewPage />
    </WorkspaceSuspense>
  );
}
