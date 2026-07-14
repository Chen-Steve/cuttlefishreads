import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminAccess } from "@/lib/access";
import { AdminNav } from "./_components/admin-nav";

export const metadata: Metadata = {
  title: {
    absolute: "Workspace",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();

  if (!access) redirect("/login");
  // Logged-in readers without translator access get sent to /apply instead of
  // a 404 — the application page explains their status.
  if (!access.hasWorkspace) redirect("/apply");

  return (
    <>
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to main content
      </a>
      <main className="flex-1">
        <AdminNav isMasterAdmin={access.isMasterAdmin} />
        <div id="workspace-content" tabIndex={-1}>
          {children}
        </div>
      </main>
    </>
  );
}
