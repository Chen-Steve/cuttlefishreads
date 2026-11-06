import type { Metadata } from "next";

import { WorkspaceSuspense } from "../../../_components/workspace-suspense";
import { WorkspaceNovelEditPage } from "../../../_pages/novel-edit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type EditNovelParams = { params: Promise<{ id: string }> };

export default function EditNovelPage({ params }: EditNovelParams) {
  return (
    <WorkspaceSuspense>
      <EditNovel params={params} />
    </WorkspaceSuspense>
  );
}

async function EditNovel({ params }: EditNovelParams) {
  const { id } = await params;
  return <WorkspaceNovelEditPage novelId={id} />;
}
