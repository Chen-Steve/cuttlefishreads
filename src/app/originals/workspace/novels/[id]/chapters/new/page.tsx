import type { Metadata } from "next";

import { WorkspaceChapterNewPage } from "@/app/admin/_pages/chapter-new-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthorAddChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceChapterNewPage workspace="originals" novelId={id} />;
}
