import type { Metadata } from "next";

import { WorkspaceNovelsPage } from "@/app/admin/_pages/novels-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthorWorkspacePage() {
  return <WorkspaceNovelsPage workspace="originals" />;
}
