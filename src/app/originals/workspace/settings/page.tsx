import type { Metadata } from "next";

import { WorkspaceSettingsPage } from "@/app/admin/_pages/settings-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthorSettingsPage() {
  return <WorkspaceSettingsPage workspace="originals" />;
}
