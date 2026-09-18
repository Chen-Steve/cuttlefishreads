import type { Metadata } from "next";

import { WorkspaceSettingsPage } from "../_pages/settings-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return <WorkspaceSettingsPage workspace="translations" />;
}
