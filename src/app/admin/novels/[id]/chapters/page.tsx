import type { Metadata } from "next";

import { WorkspaceChaptersPage } from "../../../_pages/chapters-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ChaptersListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceChaptersPage workspace="translations" novelId={id} />;
}
