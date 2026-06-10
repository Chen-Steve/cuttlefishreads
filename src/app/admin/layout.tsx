import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminAccess } from "@/lib/access";
import { AdminNav } from "./_components/admin-nav";

export const metadata: Metadata = {
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
    <main className="flex-1">
      <AdminNav isMasterAdmin={access.isMasterAdmin} />
      {children}
    </main>
  );
}
