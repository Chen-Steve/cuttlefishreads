import type { Metadata } from "next";

import { WorkspaceSuspense } from "../_components/workspace-suspense";
import { WorkspaceDashboardPage } from "../_pages/dashboard-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type DashboardParams = { searchParams: Promise<{ view?: string }> };

export default function DashboardPage({ searchParams }: DashboardParams) {
  return (
    <WorkspaceSuspense>
      <Dashboard searchParams={searchParams} />
    </WorkspaceSuspense>
  );
}

async function Dashboard({ searchParams }: DashboardParams) {
  const { view } = await searchParams;
  return <WorkspaceDashboardPage view={view} />;
}
