import type { Metadata } from "next";

import { WorkspaceNovelEditPage } from "../../../_pages/novel-edit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function EditNovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceNovelEditPage workspace="translations" novelId={id} />;
}
