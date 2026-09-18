import type { Metadata } from "next";

import { WorkspaceChapterEditPage } from "../../../../../_pages/chapter-edit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  return (
    <WorkspaceChapterEditPage
      workspace="translations"
      novelId={id}
      chapterId={chapterId}
    />
  );
}
