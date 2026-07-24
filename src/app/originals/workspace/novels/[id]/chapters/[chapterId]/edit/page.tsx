import type { Metadata } from "next";

import { WorkspaceChapterEditPage } from "@/app/admin/_pages/chapter-edit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthorEditChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  return (
    <WorkspaceChapterEditPage
      workspace="originals"
      novelId={id}
      chapterId={chapterId}
    />
  );
}
