import type { Metadata } from "next";

import { WorkspaceChapterNewPage } from "../../../../_pages/chapter-new-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AddChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceChapterNewPage workspace="translations" novelId={id} />;
}
