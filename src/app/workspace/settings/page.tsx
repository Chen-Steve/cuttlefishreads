import type { Metadata } from "next";

import { WorkspaceSuspense } from "../_components/workspace-suspense";
import { WorkspaceSettingsPage } from "../_pages/settings-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return (
    <WorkspaceSuspense>
      <WorkspaceSettingsPage />
    </WorkspaceSuspense>
  );
}
