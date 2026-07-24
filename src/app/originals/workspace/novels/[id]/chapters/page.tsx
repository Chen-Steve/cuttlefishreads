import type { Metadata } from "next";

import { WorkspaceChaptersPage } from "@/app/admin/_pages/chapters-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthorChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceChaptersPage workspace="originals" novelId={id} />;
}
