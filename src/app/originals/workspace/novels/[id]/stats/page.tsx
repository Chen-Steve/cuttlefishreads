import type { Metadata } from "next";

import { WorkspaceNovelStatsPage } from "@/app/admin/_pages/novel-stats-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthorNovelStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range } = await searchParams;
  return (
    <WorkspaceNovelStatsPage
      workspace="originals"
      novelId={id}
      range={range}
    />
  );
}
