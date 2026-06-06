import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
  if (!access.hasWorkspace) notFound();

  return (
    <main className="flex-1">
      <AdminNav isMasterAdmin={access.isMasterAdmin} />
      {children}
    </main>
  );
}
