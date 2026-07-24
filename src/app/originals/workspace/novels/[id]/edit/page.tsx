import type { Metadata } from "next";

import { WorkspaceNovelEditPage } from "@/app/admin/_pages/novel-edit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthorEditSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceNovelEditPage workspace="originals" novelId={id} />;
}
