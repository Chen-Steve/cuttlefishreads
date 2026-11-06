import type { Metadata } from "next";

import { WorkspaceSuspense } from "./_components/workspace-suspense";
import { WorkspaceNovelsPage } from "./_pages/novels-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <WorkspaceSuspense>
      <WorkspaceNovelsPage />
    </WorkspaceSuspense>
  );
}
