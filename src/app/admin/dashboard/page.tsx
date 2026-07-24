import type { Metadata } from "next";

import { WorkspaceDashboardPage } from "../_pages/dashboard-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <WorkspaceDashboardPage workspace="translations" view={view} />;
}
