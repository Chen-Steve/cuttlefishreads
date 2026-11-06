import type { Metadata } from "next";

import { WorkspaceSuspense } from "../../../../../_components/workspace-suspense";
import { WorkspaceChapterEditPage } from "../../../../../_pages/chapter-edit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type EditChapterParams = {
  params: Promise<{ id: string; chapterId: string }>;
};

export default function EditChapterPage({ params }: EditChapterParams) {
  return (
    <WorkspaceSuspense>
      <EditChapter params={params} />
    </WorkspaceSuspense>
  );
}

async function EditChapter({ params }: EditChapterParams) {
  const { id, chapterId } = await params;
  return (
    <WorkspaceChapterEditPage
      novelId={id}
      chapterId={chapterId}
    />
  );
}
