import type { Metadata } from "next";

import { WorkspaceSuspense } from "../../../_components/workspace-suspense";
import { WorkspaceChaptersPage } from "../../../_pages/chapters-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type ChaptersParams = { params: Promise<{ id: string }> };

export default function ChaptersListPage({ params }: ChaptersParams) {
  return (
    <WorkspaceSuspense>
      <ChaptersList params={params} />
    </WorkspaceSuspense>
  );
}

async function ChaptersList({ params }: ChaptersParams) {
  const { id } = await params;
  return <WorkspaceChaptersPage novelId={id} />;
}
