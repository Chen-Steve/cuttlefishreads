import type { Metadata } from "next";

import { WorkspaceSuspense } from "../../../../_components/workspace-suspense";
import { WorkspaceChapterBulkPage } from "../../../../_pages/chapter-bulk-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type BulkUploadParams = { params: Promise<{ id: string }> };

export default function BulkUploadChaptersPage({ params }: BulkUploadParams) {
  return (
    <WorkspaceSuspense>
      <BulkUpload params={params} />
    </WorkspaceSuspense>
  );
}

async function BulkUpload({ params }: BulkUploadParams) {
  const { id } = await params;
  return <WorkspaceChapterBulkPage novelId={id} />;
}
