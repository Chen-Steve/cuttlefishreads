import type { Metadata } from "next";

import { WorkspaceNovelNewPage } from "../../_pages/novel-new-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CreateNovelPage() {
  return <WorkspaceNovelNewPage workspace="translations" />;
}
