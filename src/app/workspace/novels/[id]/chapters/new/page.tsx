import type { Metadata } from "next";

import { WorkspaceSuspense } from "../../../../_components/workspace-suspense";
import { WorkspaceChapterNewPage } from "../../../../_pages/chapter-new-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type AddChapterParams = { params: Promise<{ id: string }> };

export default function AddChapterPage({ params }: AddChapterParams) {
  return (
    <WorkspaceSuspense>
      <AddChapter params={params} />
    </WorkspaceSuspense>
  );
}

async function AddChapter({ params }: AddChapterParams) {
  const { id } = await params;
  return <WorkspaceChapterNewPage novelId={id} />;
}
