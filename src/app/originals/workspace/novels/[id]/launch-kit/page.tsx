import type { Metadata } from "next";

import { WorkspaceNovelLaunchKitPage } from "@/app/admin/_pages/novel-launch-kit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthorSeriesLaunchKitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceNovelLaunchKitPage workspace="originals" novelId={id} />;
}
