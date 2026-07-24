import type { Metadata } from "next";

import { WorkspaceDashboardPage } from "@/app/admin/_pages/dashboard-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <WorkspaceDashboardPage workspace="originals" view={view} />;
}
