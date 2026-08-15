import type { Metadata } from "next";

import { WorkspaceChapterBulkPage } from "../../../../_pages/chapter-bulk-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BulkUploadChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceChapterBulkPage workspace="translations" novelId={id} />;
}
