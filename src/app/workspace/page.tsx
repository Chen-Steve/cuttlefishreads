import type { Metadata } from "next";

import { WorkspaceNovelsPage } from "./_pages/novels-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <WorkspaceNovelsPage workspace="translations" />;
}
