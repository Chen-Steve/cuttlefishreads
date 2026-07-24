import type { Metadata } from "next";

import { WorkspaceNovelNewPage } from "@/app/admin/_pages/novel-new-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthorCreateSeriesPage() {
  return <WorkspaceNovelNewPage workspace="originals" />;
}
